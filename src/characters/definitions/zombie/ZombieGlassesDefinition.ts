import { CHARACTER_KEYS } from '../../../config/keys'
import { ZombieBaseDefinition } from '../../base/ZombieBaseDefinition'

export class ZombieGlassesDefinition extends ZombieBaseDefinition {
  readonly id = CHARACTER_KEYS.ZOMBIE_GLASSES
  readonly label = 'Zombie (Glasses)'
  readonly sheetKey = 'zombie-glasses'
  readonly metadataKey = 'zombie-glasses-meta'
  readonly texturePath = 'assets/characters/zombie/glasses/zombie_glasses.png'
  readonly metadataPath = 'assets/characters/zombie/glasses/zombie_glasses.json'
}

export const ZOMBIE_GLASSES_DEFINITION = new ZombieGlassesDefinition()
