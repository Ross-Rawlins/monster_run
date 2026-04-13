import type { Tile } from '../TileTypes'

/**
 * Identifies a terrain layer in the tilemap system.
 */
export type LayerName = 'background' | 'caves' | 'ground' | 'platforms'

/**
 * Context passed to each generator during chunk generation.
 *
 * This allows generators to:
 * - Access the seeded left column for seamless cross-chunk continuation.
 * - Read previously completed layers (e.g., platforms reads to avoid ground).
 * - Avoid tight coupling between layer systems.
 */
export interface GeneratorContext {
  /**
   * The right column of the previous chunk, used to ensure seamless joins.
   * For chunk 0, this is null. For subsequent chunks, it contains the
   * last column of tiles from the previous chunk for the current layer.
   *
   * **Important:** This is specific to the current layer. Other layers'
   * earlier columns do not carry seeding data yet—use completedLayers
   * to access entire tile grids from already-generated layers.
   */
  seededLeftColumn: Tile[] | null

  /**
   * Read-only reference to all tile grids generated before this layer.
   *
   * **Key:** LayerName (e.g., 'caves', 'ground', 'platforms')
   * **Value:** complete 2D tile grid for that layer
   *
   * Generators use this to:
   * - Avoid collision (e.g., platforms check ground layout to maintain clearance).
   * - Reference generated regions (e.g., caves generated first for optional upper-layer reading).
   */
  completedLayers: ReadonlyMap<LayerName, ReadonlyArray<ReadonlyArray<Tile>>>
}

/**
 * Standard generator interface all terrain generators must implement.
 *
 * Generators are **stateless** and **serializable** — they take input
 * (options + context) and mutate a tile grid in-place. They must not:
 * - Store state between calls.
 * - Read external files or settings outside their constraints.
 * - Depend on other generators existing.
 */
export interface ILayerGenerator {
  /**
   * Fills the provided tile grid in-place with terrain tiles from this layer.
   *
   * The grid is pre-allocated (width × height) and may be partially filled
   * with tiles from other layers. Generators should:
   * - Only write to cells for which they own responsibility (e.g., GROUND_TILE).
   * - Never erase other layers' tiles (check before overwriting).
   * - Return without side effects if rules prevent placement.
   *
   * @param tiles - 2D tile grid (row-major: tiles[row][col]). Mutated in-place.
   * @param context - GeneratorContext providing seeding and previous layers' state.
   */
  generate(tiles: Tile[][], context: GeneratorContext): void
}
