/**
 * World-generation types for the infinite runner chunk system.
 *
 * Each chunk has a fixed pixel width and is positioned in "world space".
 * The screen renders from world position (previewScrollX) to
 * (previewScrollX + screenWidth), so a chunk's screen X is:
 *   screenX = chunk.worldX - previewScrollX
 */

/** Biomes determine which tile frames are used when building a chunk. */
export type Biome = 'graveyard'

/** Logical roles for ground/surface tiles, resolved to atlas frame names per biome. */
export type TileRole =
  | 'surface_left'
  | 'surface_center'
  | 'surface_center_alt'
  | 'surface_right'
  | 'surface_isolated'
  | 'surface_platform_left'
  | 'surface_platform_center'
  | 'surface_platform_right'
  | 'fill_top'
  | 'fill_center'
  | 'fill_center_alt'
  | 'fill_left_wall'
  | 'fill_right_wall'
  | 'fill_bottom'
  | 'fill_bottom_left'
  | 'fill_bottom_right'
  | 'fill_corner_top_left'
  | 'fill_corner_top_right'
  | 'fill_isolated'

/** 4-directional neighbour context used by the autotiler. */
export interface TileNeighbours {
  self: boolean
  above: boolean
  below: boolean
  left: boolean
  right: boolean
}

/** Configuration for a gap in the ground layer within a chunk. */
export interface GapConfig {
  /** Tile column where the gap begins (0 = chunk left edge). */
  startTile: number
  /** Width of the gap in tiles. */
  widthTiles: number
}

/** Configuration for an elevated platform within a chunk. */
export interface PlatformConfig {
  /** Tile column offset from chunk left edge. */
  startTile: number
  /** Number of tiles wide. */
  widthTiles: number
  /**
   * How many tile-rows above the ground surface the platform sits.
   * E.g. 3 means the platform top is 3 * tileRenderedSize pixels above groundY.
   */
  tilesAboveGround: number
}

/** Decoration placement within a chunk. */
export interface DecorationConfig {
  /** Tile column offset from chunk left edge. */
  tileCol: number
  /** Atlas frame name (from the objects atlas). */
  frame: string
  /** Depth for the decoration sprite. */
  depth: number
}

/**
 * A chunk template describes the structure of one chunk section.
 * The ChunkBuilder reads this to lay out tiles, platforms, and decorations.
 */
export interface ChunkTemplate {
  id: string
  /** Relative spawn probability — higher = appears more often. */
  weight: number
  /**
   * Minimum chunk index before this template can appear.
   * Use to gate harder templates behind a minimum distance.
   */
  minChunk: number
  /** Determines which tile frame set is used. */
  biome: Biome
  /** Ground gap sections (no ground tiles, player can fall). */
  gaps: GapConfig[]
  /** Elevated platforms above the ground. */
  platforms: PlatformConfig[]
  /** Decorative objects placed on the surface. */
  decorations: DecorationConfig[]
}

/** A chunk that has been spawned and is currently active in the scene. */
export interface ActiveChunk {
  /** Left edge of the chunk in world-space pixels. */
  worldX: number
  /** Right edge of the chunk in world-space pixels (worldX + chunkWidth). */
  rightEdgeWorld: number
  /** The template this chunk was built from. */
  template: ChunkTemplate
  /** Container holding all visual tile images for this chunk. */
  container: Phaser.GameObjects.Container
  /** Decoration sprites added to the scene (outside the container). */
  decorations: Phaser.GameObjects.Image[]
}

/** Output of the difficulty scaling function. */
export interface DifficultyParams {
  /** Minimum gap width in tiles. */
  minGapTiles: number
  /** Maximum gap width in tiles. */
  maxGapTiles: number
  /** Probability (0–1) that an eligible tile column spawns an enemy. */
  enemyDensity: number
  /** Target number of platforms per chunk. */
  platformCount: number
  /** Base scroll speed multiplier (applied in InfiniteRunnerScene). */
  scrollSpeedMultiplier: number
}
