import type { LayerName } from './ILayerGenerator'

/**
 * Phaser-specific configuration for a single tilemap layer.
 *
 * This describes how a tile layer should be rendered in the scene:
 * which tileset to use, at what depth, with what parallax factor, etc.
 */
export interface TileLayerConfig {
  /**
   * Unique identifier for this layer (e.g., 'ground', 'caves', 'platforms').
   * Used to look up generated tile data from the generator pipeline.
   */
  name: LayerName

  /**
   * Phaser tileset key (e.g., 'tiles', 'bg-tileset').
   * Must match the key registered in the scene's cache or texture manager.
   */
  tilesetKey: string

  /**
   * Phaser layer depth value (0 = bottom, higher = on top).
   * Used to determine z-order when composing layers.
   *
   * Recommended stack:
   *   0 — background (parallax)
   *   1 — caves
   *   2 — ground
   *   3 — platforms
   */
  depth: number

  /**
   * Parallax scroll factor (0 < factor ≤ 1).
   * - 1.0 = camera normal scroll speed
   * - < 1.0 = slower parallax (layer lags behind camera)
   * - For background, typically 0.2–0.5 for far-away effect.
   */
  parallaxFactor: number

  /**
   * Whether this layer has physics collision enabled.
   * If true, the compositor will apply collision maps from the rules.
   */
  hasCollision: boolean

  /**
   * Layer opacity (0 = invisible, 1 = fully opaque).
   * Used for visual layering and depth cueing.
   */
  alpha: number
}
