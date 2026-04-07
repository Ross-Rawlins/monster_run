import { CHARACTER_KEYS } from '../../../config/keys'
import { ZombieBaseDefinition } from '../../base/ZombieBaseDefinition'

export class ZombieBeanieDefinition extends ZombieBaseDefinition {
  readonly id = CHARACTER_KEYS.ZOMBIE_BEANIE
  readonly label = 'Zombie (Beanie)'
  readonly sheetKey = 'zombie-beanie'
  readonly metadataKey = 'zombie-beanie-meta'
  readonly texturePath = 'assets/characters/zombie/beanie/zombie_beanie.png'
  readonly metadataPath = 'assets/characters/zombie/beanie/zombie_beanie.json'
}

export const ZOMBIE_BEANIE_DEFINITION = new ZombieBeanieDefinition()
