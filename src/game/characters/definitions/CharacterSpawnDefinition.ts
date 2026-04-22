import type { CharacterState } from '../../../characters/types'

export type SpawnSurface = 'ground_top' | 'platform_top'

export interface SurfaceSpawnConfig {
  minSpawnChunkIndex: number
  spawnChancePerCell: number
  maxPerChunk: number
  minHorizontalSpacingTiles: number
  minSurfaceWidthTiles: number
  surfaces: readonly SpawnSurface[]
}

export interface PatrolBehaviorConfig {
  patrolSpeedMultiplier: number
  riseAnimationState?: CharacterState
  moveAnimationState?: CharacterState
}

export interface CharacterPhysicsConfig {
  enableCollision: boolean
  enableGravity: boolean
}

export interface SurfaceSpawnCharacterDefinition {
  familyId: string
  characterIdPrefix: string
  spawn: SurfaceSpawnConfig
  behavior: PatrolBehaviorConfig
  physics: CharacterPhysicsConfig
}

export type CharacterSpawnDefinitionSet<T extends string = string> = Record<
  T,
  SurfaceSpawnCharacterDefinition
>

const DEFAULT_SURFACE_SPAWN_CONFIG: SurfaceSpawnConfig = {
  minSpawnChunkIndex: 0,
  spawnChancePerCell: 0.1,
  maxPerChunk: 2,
  minHorizontalSpacingTiles: 5,
  minSurfaceWidthTiles: 2,
  surfaces: ['ground_top', 'platform_top'],
}

export function createSurfaceSpawnConfig(
  overrides: Partial<SurfaceSpawnConfig>
): SurfaceSpawnConfig {
  return {
    ...DEFAULT_SURFACE_SPAWN_CONFIG,
    ...overrides,
    surfaces: overrides.surfaces ?? DEFAULT_SURFACE_SPAWN_CONFIG.surfaces,
  }
}
