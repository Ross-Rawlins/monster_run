import type { DirectionRuleSet } from '../../types/tilemaps'
import {
  getGroundRuleFrameIndices,
  resolveGroundTileFrame,
} from './ground/GroundRules'
import {
  getPlatformRuleFrameIndices,
  resolvePlatformTileFrame,
} from './platforms/PlatformRules'
import {
  getSupportRuleFrameIndices,
  resolveSupportTileFrame,
} from './supports/SupportRules'
import { TILE_ASSIGNMENTS } from '../../config/tileAssignments'
import { TILE_ROW_OPTIONS_BANDS, TILE_RULES } from '../../config/tileGeneration'

export const GRID_WIDTH = 60
export const GRID_HEIGHT = 20
export const TILE_SIZE_PX = 16
export const CHUNK_WIDTH_PX = GRID_WIDTH * TILE_SIZE_PX
export const CHUNK_HEIGHT_PX = GRID_HEIGHT * TILE_SIZE_PX
export const MAX_ACTIVE_CHUNKS = 3

export enum Tile {
  EMPTY = 0,
  PLATFORM = 5,
  GROUND = 6,
  SUPPORT = 7,
}

export const ALL_TILES: Tile[] = [
  Tile.EMPTY,
  Tile.PLATFORM,
  Tile.GROUND,
  Tile.SUPPORT,
]

function toTileArray(tileIds: number[]): Tile[] {
  return tileIds as Tile[]
}

function getRuleForTile(tile: Tile): DirectionRuleSet {
  const matchedRule = TILE_RULES.find((rule) => rule.id === tile)

  if (!matchedRule) {
    throw new Error(`Missing rule configuration for tile ${tile}`)
  }

  return matchedRule.allowed
}

export const RULES: Record<Tile, DirectionRuleSet> = {
  [Tile.EMPTY]: getRuleForTile(Tile.EMPTY),
  [Tile.PLATFORM]: getRuleForTile(Tile.PLATFORM),
  [Tile.GROUND]: getRuleForTile(Tile.GROUND),
  [Tile.SUPPORT]: getRuleForTile(Tile.SUPPORT),
}

export const COLLIDABLE_TILES = new Set<Tile>(
  TILE_RULES.filter((rule) => rule.collidable).map((rule) => rule.id as Tile)
)

// Keep mapping available for when sprites are enabled again.
// While tuning generation rules, the scene hides the tile layer.
export const TILE_RENDER_INDEX: Record<Tile, number> = {
  [Tile.EMPTY]: TILE_ASSIGNMENTS.emptyFrame,
  [Tile.PLATFORM]: TILE_ASSIGNMENTS.platformFrame,
  [Tile.GROUND]: TILE_ASSIGNMENTS.groundFrame,
  [Tile.SUPPORT]: TILE_ASSIGNMENTS.supportFrame,
}

interface TileFrameConfig {
  hasCollision: boolean
  baseFrame: number
  getRuleFrames: (collisionOnly?: boolean) => number[]
  extraCollisionFrames?: number[]
}

const TILE_FRAME_CONFIG: Record<Tile, TileFrameConfig> = {
  [Tile.EMPTY]: {
    hasCollision: false,
    baseFrame: TILE_ASSIGNMENTS.emptyFrame,
    getRuleFrames: () => [],
  },
  [Tile.PLATFORM]: {
    hasCollision: true,
    baseFrame: TILE_ASSIGNMENTS.platformFrame,
    getRuleFrames: (collisionOnly = false) =>
      getPlatformRuleFrameIndices(collisionOnly),
  },
  [Tile.GROUND]: {
    hasCollision: true,
    baseFrame: TILE_ASSIGNMENTS.groundFrame,
    getRuleFrames: (collisionOnly = false) =>
      getGroundRuleFrameIndices(collisionOnly),
  },
  [Tile.SUPPORT]: {
    // Supports remain non-collidable by generation design.
    hasCollision: false,
    baseFrame: TILE_ASSIGNMENTS.supportFrame,
    getRuleFrames: (collisionOnly = false) =>
      getSupportRuleFrameIndices(collisionOnly),
    extraCollisionFrames: [
      TILE_ASSIGNMENTS.supportOpenLeftFrame,
      TILE_ASSIGNMENTS.supportFrame,
      TILE_ASSIGNMENTS.supportOpenRightFrame,
      ...TILE_ASSIGNMENTS.supportTopFrames,
      ...TILE_ASSIGNMENTS.supportMidFrames,
      ...TILE_ASSIGNMENTS.supportCornerFrames,
      ...TILE_ASSIGNMENTS.supportBottomFrames,
    ],
  },
}

const COLLISION_FRAMES_BY_TILE: Partial<Record<Tile, number[]>> =
  Object.fromEntries(
    ALL_TILES.map((tile) => {
      const config = TILE_FRAME_CONFIG[tile]

      if (!config.hasCollision) {
        return [tile, []]
      }

      const frameSet = new Set<number>([
        config.baseFrame,
        ...config.getRuleFrames(true),
        ...(config.extraCollisionFrames ?? []),
      ])

      return [tile, Array.from(frameSet)]
    })
  ) as Partial<Record<Tile, number[]>>

export function getCollisionFrameIndicesForTile(tile: Tile): number[] {
  const frames = COLLISION_FRAMES_BY_TILE[tile]
  if (frames && frames.length > 0) {
    return frames
  }

  return [TILE_FRAME_CONFIG[tile].baseFrame]
}

export function getRenderFrameForTileAt(
  tiles: number[][],
  row: number,
  col: number
): number {
  const tile = tiles[row][col] as Tile

  if (tile === Tile.PLATFORM) {
    return resolvePlatformTileFrame(
      row,
      col,
      TILE_ASSIGNMENTS.platformFrame,
      tiles
    )
  }

  if (tile === Tile.GROUND) {
    return resolveGroundTileFrame(row, col, TILE_ASSIGNMENTS.groundFrame, tiles)
  }

  if (tile === Tile.SUPPORT) {
    return resolveSupportTileFrame(
      row,
      col,
      TILE_ASSIGNMENTS.supportFrame,
      tiles
    )
  }

  return TILE_RENDER_INDEX[tile]
}

export { GROUND_GENERATION_CONSTRAINTS } from '../../config/tileGeneration'

export function getInitialOptionsForRow(row: number): Tile[] {
  for (const band of TILE_ROW_OPTIONS_BANDS) {
    if (row <= band.maxRowInclusive) {
      return toTileArray(band.tileIds)
    }
  }

  return [Tile.GROUND]
}
