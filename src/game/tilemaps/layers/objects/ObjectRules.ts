import {
  OBJECT_RENDER_DEPTH_BY_TILE_SIZE,
  ROCK_LAYER_48X48_CONFIG,
  ROCK_LAYER_32X32_CONFIG,
  resolveObjectFootprintFromAtlasSize,
} from './ObjectLayerConfig'
import { RUNNER_ASSET_KEYS } from '../../../../config/keys'

export type ObjectPlacementSurface =
  | 'ground_top'
  | 'platform_top'
  | 'platform_under'
  | 'ground_internal'
  | 'ground_internal_any'
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
  /** Texture key used for this rule. Defaults to the shared objects atlas. */
  textureKey?: string
  atlasSize?: string
  /** Explicit Phaser depth for rendered objects. Defaults to 4 (foreground). */
  renderDepth?: number
  /** Optional pixel Y offset applied when rendering placements from this rule. */
  renderYOffsetPx?: number
  minSpacingTiles?: {
    horizontal: number
    vertical: number
  }
  blockedAdjacentAtlasSizes?: readonly string[]
  /** For top-surface rules, require one same-surface tile on both sides of the footprint. */
  requireInteriorSupportSurface?: boolean
  frameIndexRange?: {
    min: number
    max: number
  }
  frameIndices?: number[]
  /** Explicit frame names; used when not following the Objects_* atlas naming. */
  frameKeys?: string[]
  deterministicFrameSelection?: boolean
  /** When true, a static Arcade physics body sized to this object's tile
   * footprint will be created at runtime so characters cannot walk through it. */
  hasCollision?: boolean
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
  /** Texture key used to render this placement. */
  textureKey?: string
  animationKey?: string
  /** Phaser depth override. Defaults to 4 (foreground). */
  renderDepth?: number
  /** Optional pixel Y offset applied during rendering. */
  renderYOffsetPx?: number
  footprintWidth?: number
  footprintHeight?: number
  /** When true, a static Arcade physics body will be created for this placement. */
  hasCollision?: boolean
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
    footprint: resolveObjectFootprintFromAtlasSize('64x96'),
    chance: 0.24,
    slotsPerMatch: 1,
    atlasSize: '64x96',
    renderDepth: OBJECT_RENDER_DEPTH_BY_TILE_SIZE.size64x96,
    frameIndices: [1, 2, 3],
    randomGaps: { baseChance: 0.32, adjacentChance: 0.65 },
    hasCollision: true,
  },
  {
    id: 'batch5-path-64x96-platform-top',
    surface: 'platform_top',
    chunkSection: 'any',
    footprint: resolveObjectFootprintFromAtlasSize('64x96'),
    chance: 0.2,
    slotsPerMatch: 1,
    atlasSize: '64x96',
    renderDepth: OBJECT_RENDER_DEPTH_BY_TILE_SIZE.size64x96,
    frameIndices: [1, 2, 3],
    randomGaps: { baseChance: 0.3, adjacentChance: 0.62 },
    hasCollision: true,
  },
  {
    id: 'size-48x48-ground-top-index-1-24',
    surface: 'ground_top',
    chunkSection: 'any',
    footprint: ROCK_LAYER_48X48_CONFIG.footprint,
    chance: ROCK_LAYER_48X48_CONFIG.chance.groundTop,
    slotsPerMatch: 1,
    atlasSize: ROCK_LAYER_48X48_CONFIG.atlasSize,
    renderDepth: ROCK_LAYER_48X48_CONFIG.renderDepth,
    renderYOffsetPx: ROCK_LAYER_48X48_CONFIG.renderYOffsetPx,
    minSpacingTiles: ROCK_LAYER_48X48_CONFIG.minSpacingTiles,
    blockedAdjacentAtlasSizes:
      ROCK_LAYER_48X48_CONFIG.blockedAdjacentAtlasSizes,
    requireInteriorSupportSurface:
      ROCK_LAYER_48X48_CONFIG.requireInteriorSupportSurface,
    frameIndexRange: ROCK_LAYER_48X48_CONFIG.indexRange,
    randomGaps: ROCK_LAYER_48X48_CONFIG.randomGaps.groundTop,
    hasCollision: true,
  },
  {
    id: 'size-48x48-platform-top-index-1-24',
    surface: 'platform_top',
    chunkSection: 'any',
    footprint: ROCK_LAYER_48X48_CONFIG.footprint,
    chance: ROCK_LAYER_48X48_CONFIG.chance.platformTop,
    slotsPerMatch: 1,
    atlasSize: ROCK_LAYER_48X48_CONFIG.atlasSize,
    renderDepth: ROCK_LAYER_48X48_CONFIG.renderDepth,
    renderYOffsetPx: ROCK_LAYER_48X48_CONFIG.renderYOffsetPx,
    minSpacingTiles: ROCK_LAYER_48X48_CONFIG.minSpacingTiles,
    blockedAdjacentAtlasSizes:
      ROCK_LAYER_48X48_CONFIG.blockedAdjacentAtlasSizes,
    requireInteriorSupportSurface:
      ROCK_LAYER_48X48_CONFIG.requireInteriorSupportSurface,
    frameIndexRange: ROCK_LAYER_48X48_CONFIG.indexRange,
    randomGaps: ROCK_LAYER_48X48_CONFIG.randomGaps.platformTop,
    hasCollision: true,
  },
  {
    id: 'size-32x32-ground-top-index-1-32',
    surface: 'ground_top',
    chunkSection: 'any',
    footprint: ROCK_LAYER_32X32_CONFIG.footprint,
    chance: ROCK_LAYER_32X32_CONFIG.chance.groundTop,
    slotsPerMatch: 1,
    atlasSize: ROCK_LAYER_32X32_CONFIG.atlasSize,
    renderDepth: ROCK_LAYER_32X32_CONFIG.renderDepth,
    renderYOffsetPx: ROCK_LAYER_32X32_CONFIG.renderYOffsetPx,
    minSpacingTiles: ROCK_LAYER_32X32_CONFIG.minSpacingTiles,
    requireInteriorSupportSurface:
      ROCK_LAYER_32X32_CONFIG.requireInteriorSupportSurface,
    frameIndexRange: ROCK_LAYER_32X32_CONFIG.indexRange,
    randomGaps: ROCK_LAYER_32X32_CONFIG.randomGaps.groundTop,
    hasCollision: true,
  },
  {
    id: 'size-32x32-platform-top-index-1-32',
    surface: 'platform_top',
    chunkSection: 'any',
    footprint: ROCK_LAYER_32X32_CONFIG.footprint,
    chance: ROCK_LAYER_32X32_CONFIG.chance.platformTop,
    slotsPerMatch: 1,
    atlasSize: ROCK_LAYER_32X32_CONFIG.atlasSize,
    renderDepth: ROCK_LAYER_32X32_CONFIG.renderDepth,
    renderYOffsetPx: ROCK_LAYER_32X32_CONFIG.renderYOffsetPx,
    minSpacingTiles: ROCK_LAYER_32X32_CONFIG.minSpacingTiles,
    requireInteriorSupportSurface:
      ROCK_LAYER_32X32_CONFIG.requireInteriorSupportSurface,
    frameIndexRange: ROCK_LAYER_32X32_CONFIG.indexRange,
    randomGaps: ROCK_LAYER_32X32_CONFIG.randomGaps.platformTop,
    hasCollision: true,
  },
  {
    id: 'batch1-ground-top-21-50',
    surface: 'ground_top',
    chunkSection: 'any',
    footprint: { width: 1, height: 1 },
    chance: 0.92,
    slotsPerMatch: 1,
    renderDepth: OBJECT_RENDER_DEPTH_BY_TILE_SIZE.size16x16,
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
    renderDepth: OBJECT_RENDER_DEPTH_BY_TILE_SIZE.size16x16,
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
    renderDepth: OBJECT_RENDER_DEPTH_BY_TILE_SIZE.size16x16,
    frameIndexRange: { min: 1, max: 14 },
    randomGaps: { baseChance: 0.24, adjacentChance: 0.48 },
  },
  {
    id: 'torch-ground-internal',
    surface: 'ground_internal_any',
    chunkSection: 'any',
    footprint: { width: 1, height: 1 },
    chance: 0.28,
    slotsPerMatch: 1,
    textureKey: RUNNER_ASSET_KEYS.TORCH_ATLAS,
    renderDepth: OBJECT_RENDER_DEPTH_BY_TILE_SIZE.size32x32,
    frameKeys: [
      'frame_001.png',
      'frame_002.png',
      'frame_003.png',
      'frame_004.png',
      'frame_005.png',
      'frame_006.png',
      'frame_007.png',
      'frame_008.png',
    ],
    minSpacingTiles: { horizontal: 3, vertical: 2 },
    animation: {
      key: 'torch-flame-flicker',
      frames: [
        {
          frameIndices: [1, 2, 3, 4, 5, 6, 7, 8],
          frameDuration: 90,
        },
      ],
      randomStartFrame: true,
    },
    randomGaps: { baseChance: 0.2, adjacentChance: 0.38 },
  },
  {
    id: 'batch2-platform-under-1-14',
    surface: 'platform_under',
    chunkSection: 'any',
    footprint: { width: 1, height: 1 },
    chance: 0.72,
    slotsPerMatch: 1,
    renderDepth: OBJECT_RENDER_DEPTH_BY_TILE_SIZE.underPlatform,
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
    renderDepth: OBJECT_RENDER_DEPTH_BY_TILE_SIZE.size16x16,
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
    renderDepth: OBJECT_RENDER_DEPTH_BY_TILE_SIZE.size16x16,
    frameIndices: [15, 17, 19],
    deterministicFrameSelection: true,
    randomGaps: { baseChance: 0.24, adjacentChance: 0.58 },
  },
  // 48x64 background objects — placed behind all other objects (depth < 1.2).
  // Footprint is 3 tiles wide × 4 tiles tall. Ground top surface only to keep them
  // anchored on solid ground columns.
  {
    id: 'batch6-48x64-ground-top',
    surface: 'ground_top',
    chunkSection: 'any',
    footprint: resolveObjectFootprintFromAtlasSize('48x64'),
    chance: 0.55,
    slotsPerMatch: 1,
    atlasSize: '48x64',
    renderDepth: OBJECT_RENDER_DEPTH_BY_TILE_SIZE.size48x64Background,
    requireInteriorSupportSurface: true,
    frameIndexRange: { min: 1, max: 8 },
    randomGaps: { baseChance: 0.35, adjacentChance: 0.65 },
    hasCollision: true,
  },
  {
    id: 'batch6-48x64-platform-top',
    surface: 'platform_top',
    chunkSection: 'any',
    footprint: resolveObjectFootprintFromAtlasSize('48x64'),
    chance: 0.48,
    slotsPerMatch: 1,
    atlasSize: '48x64',
    renderDepth: OBJECT_RENDER_DEPTH_BY_TILE_SIZE.size48x64Background,
    requireInteriorSupportSurface: true,
    frameIndexRange: { min: 1, max: 8 },
    randomGaps: { baseChance: 0.38, adjacentChance: 0.68 },
    hasCollision: true,
  },
]
