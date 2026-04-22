import type { SurfaceSpawnCharacterDefinition } from './CharacterSpawnDefinition'
import { SKULL_PREVIEW_SPAWN_CONFIG } from '../SkullPreviewSpawnConfig'

export const SKULL_CHARACTER_DEFINITION: SurfaceSpawnCharacterDefinition = {
  familyId: 'skull',
  characterIdPrefix: 'skull-',
  spawn: SKULL_PREVIEW_SPAWN_CONFIG,
  behavior: {
    patrolSpeedMultiplier: 0.1,
    riseAnimationState: undefined,
    moveAnimationState: 'move',
  },
  physics: {
    enableCollision: true,
    enableGravity: true,
  },
}
