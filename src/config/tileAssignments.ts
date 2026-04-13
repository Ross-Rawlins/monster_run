export const TILE_ASSIGNMENTS = {
  // Logical tile IDs -> tileset frame indices
  // Update these when art mapping is finalized.
  emptyFrame: -1,
  platformFrame: 2,
  groundFrame: 0,
  // Tiles_Ground_Seperated_226/225/227 are 1-based names from atlas export.
  // Cave tiles use the same frames (formerly called "support" tiles).
  // Tilemap frame indices are 0-based, so subtract 1.
  caveFrame: 225,
  caveOpenLeftFrame: 224,
  caveOpenRightFrame: 226,
  caveTopFrames: [224, 225, 226, 227],
  caveMidFrames: [228, 229, 230, 231],
  caveCornerFrames: [232, 233, 234, 235],
  caveBottomFrames: [236, 237, 238, 239],
} as const

export type TileAssignmentKey = keyof typeof TILE_ASSIGNMENTS
