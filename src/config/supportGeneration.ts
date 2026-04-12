export interface SupportGenerationConstraints {
  tileId: number
  maxHorizontalJitterPerRow: number
  maxFlareColumns: number
  inwardFlareStartRowOffset: number
  maxInwardFlareColumns: number
  edgeChangeStrideRows: number
  inwardFlareChance: number
  outwardFlareChance: number
  trimmedEdgeTailMinRows: number
  trimmedEdgeTailMaxRows: number
  minSupportWidth: number
  stopWhenTouchingGround: boolean
}

export const SUPPORT_GENERATION_CONSTRAINTS: SupportGenerationConstraints = {
  tileId: 7,
  maxHorizontalJitterPerRow: 2,
  maxFlareColumns: 2,
  inwardFlareStartRowOffset: 2,
  maxInwardFlareColumns: 3,
  edgeChangeStrideRows: 1,
  inwardFlareChance: 0.8,
  outwardFlareChance: 0.65,
  trimmedEdgeTailMinRows: 1,
  trimmedEdgeTailMaxRows: 2,
  minSupportWidth: 4,
  stopWhenTouchingGround: false,
}
