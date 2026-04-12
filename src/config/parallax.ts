import type {
  ParallaxLayerBandConfig,
  ResolvedParallaxLayerConfig,
} from '../managers/parallax/types'
import { INFINITE_RUNNER_COLORS } from './colors'

export const PARALLAX_GRID_ROWS = 14

export const PARALLAX_LAYER_BANDS: ReadonlyArray<ParallaxLayerBandConfig> = [
  {
    frame: 'Tilemap_Background_Spooky_Back.png',
    depth: -10,
    speed: 0.1,
    rowStart: 3,
    rowSpan: 2,
    fillColor: INFINITE_RUNNER_COLORS.secondBand,
    fillDepth: -30,
  },
  {
    frame: 'Tilemap_Background_Spooky_Mid.png',
    depth: -5,
    speed: 0.18,
    rowStart: 7,
    rowSpan: 2,
    fillColor: INFINITE_RUNNER_COLORS.thirdBand,
    fillDepth: -15,
  },
  {
    frame: 'Tilemap_Background_Spooky_Front.png',
    depth: -2,
    speed: 0.4,
    rowStart: 11,
    rowSpan: 2,
    fillColor: INFINITE_RUNNER_COLORS.forthBand,
    fillDepth: -8,
  },
]

export function resolveParallaxLayerConfigs(
  cameraHeight: number
): ResolvedParallaxLayerConfig[] {
  const gridHeight = cameraHeight / PARALLAX_GRID_ROWS

  return PARALLAX_LAYER_BANDS.map((band) => ({
    frame: band.frame,
    depth: band.depth,
    speed: band.speed,
    top: gridHeight * (band.rowStart - 1),
    stripHeight: gridHeight * band.rowSpan,
    fillColor: band.fillColor,
    fillDepth: band.fillDepth,
  }))
}
