import { SUPPORT_GENERATION_CONSTRAINTS } from '../../../../config/supportGeneration'
import type { CaveGenerationConstraints } from './types'

export const TILE_CAVE = 7

export const CAVE_GENERATION_CONSTRAINTS: CaveGenerationConstraints = {
  ...SUPPORT_GENERATION_CONSTRAINTS,
  // Hold a cave silhouette for multiple rows before allowing another edge shift.
  edgeChangeStrideRows: 3,
  // Never let the descending cave body collapse to a single-tile column.
  minLowerRowWidth: 2,
}
