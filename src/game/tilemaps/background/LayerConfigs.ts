import type { TileLayerConfig } from '../contracts/TileLayerConfig'

/**
 * Tile layer rendering configurations for the three terrain layers.
 *
 * These define how each generated layer is rendered in the scene:
 * depth order, physics collision, parallax factor, and opacity.
 *
 * Depth stack: caves(1) → ground(2) → platforms(3)
 * Parallax background sprites (managed by ParallaxBackgroundManager) sit at
 * depths -10 to -2 and are independent of this configuration.
 */
export const TERRAIN_LAYER_CONFIGS: TileLayerConfig[] = [
  {
    name: 'caves',
    tilesetKey: 'tiles-atlas',
    depth: 1,
    parallaxFactor: 1.0,
    hasCollision: false,
    alpha: 1.0,
  },
  {
    name: 'ground',
    tilesetKey: 'tiles-atlas',
    depth: 2,
    parallaxFactor: 1.0,
    hasCollision: true,
    alpha: 1.0,
  },
  {
    name: 'platforms',
    tilesetKey: 'tiles-atlas',
    depth: 3,
    parallaxFactor: 1.0,
    hasCollision: true,
    alpha: 1.0,
  },
]
