export type ObjectPlacementSurface =
  | 'ground_top'
  | 'platform_top'
  | 'platform_under'
  | 'ground_internal'
  | 'ground_internal_corner_nw'
  | 'ground_internal_corner_ne'

export type ObjectChunkSection = 'any' | 'left' | 'middle' | 'right'

export interface ObjectAnimationFrames {
  frameIndices: number[]
  frameDuration: number
}

export interface ObjectRuleDefinition {
  id: string
  surface: ObjectPlacementSurface
  chunkSection: ObjectChunkSection
  footprint: {
    width: number
    height: number
  }
  chance: number
  slotsPerMatch: number
  atlasSize?: string
  /** Explicit Phaser depth for rendered objects. Defaults to 4 (foreground). */
  renderDepth?: number
  frameIndexRange?: {
    min: number
    max: number
  }
  frameIndices?: number[]
  deterministicFrameSelection?: boolean
  randomGaps?: {
    baseChance: number
    adjacentChance: number
  }
  animation?: {
    key: string
    frames: ObjectAnimationFrames[]
    randomStartFrame?: boolean
  }
}

export interface GeneratedObjectPlacement {
  row: number
  col: number
  frameKey: string
  animationKey?: string
  /** Phaser depth override. Defaults to 4 (foreground). */
  renderDepth?: number
  footprintWidth?: number
}

export function toSeparated16x16ObjectFrameKey(index: number): string {
  return `16x16/Objects_16x16_Seperated_${index}.png`
}

export function toAtlasObjectFrameKey(
  atlasSize: string,
  index: number
): string {
  return `${atlasSize}/Objects_${atlasSize}_Seperated_${index}.png`
}

export const OBJECT_RULES: ReadonlyArray<ObjectRuleDefinition> = [
  {
    id: 'batch5-path-64x96-ground-top',
    surface: 'ground_top',
    chunkSection: 'any',
    footprint: { width: 4, height: 6 },
    chance: 0.08,
    slotsPerMatch: 1,
    atlasSize: '64x96',
    renderDepth: 1.5,
    frameIndices: [1, 2, 3],
    randomGaps: { baseChance: 0.55, adjacentChance: 0.95 },
  },
  {
    id: 'batch5-path-64x96-platform-top',
    surface: 'platform_top',
    chunkSection: 'any',
    footprint: { width: 4, height: 6 },
    chance: 0.07,
    slotsPerMatch: 1,
    atlasSize: '64x96',
    renderDepth: 1.5,
    frameIndices: [1, 2, 3],
    randomGaps: { baseChance: 0.55, adjacentChance: 0.95 },
  },
  {
    id: 'batch1-ground-top-21-50',
    surface: 'ground_top',
    chunkSection: 'any',
    footprint: { width: 1, height: 1 },
    chance: 0.92,
    slotsPerMatch: 1,
    renderDepth: 1.2,
    frameIndexRange: { min: 21, max: 38 },
    randomGaps: { baseChance: 0.2, adjacentChance: 0.45 },
  },
  {
    id: 'batch1-platform-top-21-50',
    surface: 'platform_top',
    chunkSection: 'any',
    footprint: { width: 1, height: 1 },
    chance: 0.88,
    slotsPerMatch: 1,
    renderDepth: 1.2,
    frameIndexRange: { min: 21, max: 38 },
    randomGaps: { baseChance: 0.18, adjacentChance: 0.4 },
  },
  {
    id: 'batch2-ground-internal-top-1-14',
    surface: 'ground_internal',
    chunkSection: 'any',
    footprint: { width: 1, height: 1 },
    chance: 0.8,
    slotsPerMatch: 1,
    renderDepth: 1.2,
    frameIndexRange: { min: 1, max: 14 },
    randomGaps: { baseChance: 0.24, adjacentChance: 0.48 },
  },
  {
    id: 'batch2-platform-under-1-14',
    surface: 'platform_under',
    chunkSection: 'any',
    footprint: { width: 1, height: 1 },
    chance: 0.72,
    slotsPerMatch: 1,
    renderDepth: 0.5,
    frameIndexRange: { min: 1, max: 14 },
    randomGaps: { baseChance: 0.22, adjacentChance: 0.44 },
  },
  {
    id: 'batch3-internal-corner-webs-a',
    surface: 'ground_internal_corner_nw',
    chunkSection: 'any',
    footprint: { width: 1, height: 1 },
    chance: 0.38,
    slotsPerMatch: 1,
    renderDepth: 1.2,
    frameIndices: [20, 18, 16],
    deterministicFrameSelection: true,
    randomGaps: { baseChance: 0.24, adjacentChance: 0.58 },
  },
  {
    id: 'batch4-internal-corner-webs-b',
    surface: 'ground_internal_corner_ne',
    chunkSection: 'any',
    footprint: { width: 1, height: 1 },
    chance: 0.38,
    slotsPerMatch: 1,
    renderDepth: 1.2,
    frameIndices: [15, 17, 19],
    deterministicFrameSelection: true,
    randomGaps: { baseChance: 0.24, adjacentChance: 0.58 },
  },
]
