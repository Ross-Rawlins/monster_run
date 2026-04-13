import type { DirectionRuleSet } from '../types/tilemaps'
import { GROUND_GENERATION_CONSTRAINTS } from '../game/tilemaps/layers/ground/GroundRules'
import { PLATFORM_GENERATION_CONSTRAINTS } from '../game/tilemaps/layers/platforms/PlatformRules'
import { SUPPORT_GENERATION_CONSTRAINTS } from './supportGeneration'

export interface TileRuleDefinition {
  id: number
  collidable: boolean
  allowed: DirectionRuleSet
}

export interface TileRowOptionsBand {
  maxRowInclusive: number
  tileIds: number[]
}

// Numeric tile IDs only:
// 0 = empty
// 5 = floating platform
// 6 = ground
// 7 = support/stand
export const TILE_RULES: TileRuleDefinition[] = [
  {
    id: 0,
    collidable: false,
    allowed: {
      up: [0],
      down: [
        0,
        5,
        GROUND_GENERATION_CONSTRAINTS.tileId,
        SUPPORT_GENERATION_CONSTRAINTS.tileId,
      ],
      left: [
        0,
        5,
        GROUND_GENERATION_CONSTRAINTS.tileId,
        SUPPORT_GENERATION_CONSTRAINTS.tileId,
      ],
      right: [
        0,
        5,
        GROUND_GENERATION_CONSTRAINTS.tileId,
        SUPPORT_GENERATION_CONSTRAINTS.tileId,
      ],
    },
  },
  {
    id: PLATFORM_GENERATION_CONSTRAINTS.tileId,
    collidable: true,
    allowed: {
      up: [0],
      down: [
        0,
        GROUND_GENERATION_CONSTRAINTS.tileId,
        SUPPORT_GENERATION_CONSTRAINTS.tileId,
      ],
      left: [0, PLATFORM_GENERATION_CONSTRAINTS.tileId],
      right: [0, PLATFORM_GENERATION_CONSTRAINTS.tileId],
    },
  },
  {
    id: GROUND_GENERATION_CONSTRAINTS.tileId,
    collidable: true,
    allowed: {
      up: [0, PLATFORM_GENERATION_CONSTRAINTS.tileId],
      down: [GROUND_GENERATION_CONSTRAINTS.tileId],
      left: [
        0,
        GROUND_GENERATION_CONSTRAINTS.tileId,
        SUPPORT_GENERATION_CONSTRAINTS.tileId,
      ],
      right: [
        0,
        GROUND_GENERATION_CONSTRAINTS.tileId,
        SUPPORT_GENERATION_CONSTRAINTS.tileId,
      ],
    },
  },
  {
    id: SUPPORT_GENERATION_CONSTRAINTS.tileId,
    collidable: true,
    allowed: {
      up: [
        0,
        PLATFORM_GENERATION_CONSTRAINTS.tileId,
        SUPPORT_GENERATION_CONSTRAINTS.tileId,
      ],
      down: [
        GROUND_GENERATION_CONSTRAINTS.tileId,
        SUPPORT_GENERATION_CONSTRAINTS.tileId,
      ],
      left: [SUPPORT_GENERATION_CONSTRAINTS.tileId],
      right: [SUPPORT_GENERATION_CONSTRAINTS.tileId],
    },
  },
]

export const TILE_ROW_OPTIONS_BANDS: TileRowOptionsBand[] = [
  { maxRowInclusive: 6, tileIds: [0] },
  {
    maxRowInclusive: PLATFORM_GENERATION_CONSTRAINTS.maxRowFromTop,
    tileIds: [0, PLATFORM_GENERATION_CONSTRAINTS.tileId],
  },
  {
    maxRowInclusive: 18,
    tileIds: [
      0,
      PLATFORM_GENERATION_CONSTRAINTS.tileId,
      SUPPORT_GENERATION_CONSTRAINTS.tileId,
    ],
  },
  {
    maxRowInclusive: Number.POSITIVE_INFINITY,
    tileIds: [
      GROUND_GENERATION_CONSTRAINTS.tileId,
      SUPPORT_GENERATION_CONSTRAINTS.tileId,
    ],
  },
]

export {
  GROUND_GENERATION_CONSTRAINTS,
  PLATFORM_GENERATION_CONSTRAINTS,
  SUPPORT_GENERATION_CONSTRAINTS,
}
