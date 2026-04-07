import { CHARACTER_KEYS } from '../../../config/keys'
import { ZombieBaseDefinition } from '../../base/ZombieBaseDefinition'

export class ZombieBrainDefinition extends ZombieBaseDefinition {
  readonly id = CHARACTER_KEYS.ZOMBIE_BRAIN
  readonly label = 'Zombie (Brain)'
  readonly sheetKey = 'zombie-brain'
  readonly metadataKey = 'zombie-brain-meta'
  readonly texturePath = 'assets/characters/zombie/brain/zombie_brain.png'
  readonly metadataPath = 'assets/characters/zombie/brain/zombie_brain.json'
}

export const ZOMBIE_BRAIN_DEFINITION = new ZombieBrainDefinition()
