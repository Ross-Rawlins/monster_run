import type { SurfaceSpawnCharacterDefinition } from './CharacterSpawnDefinition'
import { SKELETON_SPAWN_CONFIG } from '../SkeletonSpawnConfig'

/**
 * Spawn/behaviour definition for skeleton warrior characters.
 *
 * Unlike zombies (which patrol a bounded surface section), skeletons are
 * persistent chasers — they always move left and jump over obstacles to
 * reach the hero. This definition provides the shared physics and animation
 * state names; movement logic lives in SkeletonCharacterActor.
 */
export const SKELETON_CHARACTER_DEFINITION: SurfaceSpawnCharacterDefinition = {
  familyId: 'skeleton',
  characterIdPrefix: 'skeleton-',
  spawn: SKELETON_SPAWN_CONFIG,
  behavior: {
    patrolSpeedMultiplier: 1,
    riseAnimationState: undefined,
    moveAnimationState: 'move',
  },
  physics: {
    enableCollision: true,
    enableGravity: true,
  },
}
