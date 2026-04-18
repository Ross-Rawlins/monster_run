import type { GroundGenerationConstraints } from './types'

export const TILE_GROUND = 6

export const GROUND_GENERATION_CONSTRAINTS: GroundGenerationConstraints = {
  tileId: TILE_GROUND,
  minColumnHeightTiles: 2,
  maxColumnHeightTiles: 8,
  maxHeightStepDeltaRows: 2,
  minSegmentLength: 3,
  maxSegmentLength: 6,
  minGapSize: 2,
  maxGapSize: 3,
  gapChancePerSegment: 0.3,
  minimumStartingSolidColumns: 8,
}
