import {
  type CharacterSpawnDefinitionSet,
  type SurfaceSpawnCharacterDefinition,
} from './CharacterSpawnDefinition'
import { ZOMBIE_SPAWN_CONFIG } from '../ZombieSpawnConfig'

export const ZOMBIE_CHARACTER_DEFINITION: SurfaceSpawnCharacterDefinition = {
  familyId: 'zombie',
  characterIdPrefix: 'zombie-',
  spawn: ZOMBIE_SPAWN_CONFIG,
  behavior: {
    patrolSpeedMultiplier: 0.16,
    riseAnimationState: 'rise',
    moveAnimationState: 'move',
  },
  physics: {
    enableCollision: true,
    enableGravity: true,
  },
}

export const CHARACTER_DEFINITION_SET: CharacterSpawnDefinitionSet<'zombie'> = {
  zombie: ZOMBIE_CHARACTER_DEFINITION,
}
