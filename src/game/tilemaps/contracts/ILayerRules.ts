/**
 * Standard rules interface all terrain generators must implement.
 *
 * Rules files own all game logic that transforms raw logical tiles into
 * visual frames and collision parameters. They are pure, stateless,
 * and serializable — suitable for use in web workers.
 */
export interface ILayerRules<TConstraints> {
  /**
   * Generation parameters (constraints, dimensions, thresholds, etc.).
   * Must be a plain, serialisable object with no class instances.
   *
   * Examples: GROUND_GENERATION_CONSTRAINTS, PLATFORM_GENERATION_CONSTRAINTS
   */
  readonly constraints: TConstraints

  /**
   * Maps a raw logical tile ID at (row, col) to an atlas frame index.
   *
   * This function is called once per tile after generation, transforming
   * the raw tile grid into a visual frame grid for rendering.
   *
   * **Signature:**
   * - `row, col` — position in the tile grid
   * - `fallbackFrame` — default frame if this rules file returns -1 (used by
   *   preloader to ensure all needed frames are loaded)
   * - `tiles` — full read-only tile grid (allows stateful choices based on
   *   neighbors, context, etc.)
   *
   * **Return value:**
   * - A frame index (0+) if a rule matched and should be drawn.
   * - `-1` if this rules file has no opinion (draw nothing, show debug cell).
   *
   * **Immutability:** Must not mutate the `tiles` grid.
   */
  resolveFrame(
    row: number,
    col: number,
    fallbackFrame: number,
    tiles: ReadonlyArray<ReadonlyArray<number>>
  ): number

  /**
   * Returns the full set of atlas frame indices this rules file can emit.
   * Used by the asset preloader to build the correct tileset before rendering.
   *
   * @param collisionOnly — if `true`, return only frames for collision-enabled cells
   *                        (usually empty for decoration layers). If `false` or
   *                        omitted, return all possible frames for this layer.
   */
  getFrameIndices(collisionOnly?: boolean): number[]

  /**
   * Returns the set of row indices in the tile grid that carry collision.
   *
   * Row-level collision is a simplification: if a row is in this set, it means
   * collision should be enabled for that row. The caller uses this to set up
   * Phaser's physics layer.
   *
   * **Layer-specific behavior:**
   * - **Ground, Platforms:** returns top-surface rows only (where tiles rest on empty).
   * - **Caves:** returns empty Set (cave decoration tiles have no collision).
   *   Note: if solid cave walls are added in future, use a separate layer, not this one.
   * - **Background:** returns empty Set (no collision).
   *
   * @param tiles — the complete tile grid for this layer, needed to determine
   *                which rows are collision-relevant (e.g., surface rows for ground).
   */
  getCollisionRows(tiles: ReadonlyArray<ReadonlyArray<number>>): Set<number>
}
