export const TILE_ASSIGNMENTS = {
  // Logical tile IDs -> tileset frame indices
  // Update these when art mapping is finalized.
  emptyFrame: -1,
  platformFrame: 2,
  groundFrame: 0,
  // Tiles_Ground_Seperated_226/225/227 are 1-based names from atlas export.
  // Tilemap frame indices are 0-based, so subtract 1.
  supportFrame: 225,
  supportOpenLeftFrame: 224,
  supportOpenRightFrame: 226,
  supportTopFrames: [224, 225, 226, 227],
  supportMidFrames: [228, 229, 230, 231],
  supportCornerFrames: [232, 233, 234, 235],
  supportBottomFrames: [236, 237, 238, 239],
} as const

export type TileAssignmentKey = keyof typeof TILE_ASSIGNMENTS
