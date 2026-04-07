import { CHARACTER_KEYS } from '../../../config/keys'
import { ZombieBaseDefinition } from '../../base/ZombieBaseDefinition'

export class ZombieStarDefinition extends ZombieBaseDefinition {
  readonly id = CHARACTER_KEYS.ZOMBIE_STAR
  readonly label = 'Zombie (Star)'
  readonly sheetKey = 'zombie-star'
  readonly metadataKey = 'zombie-star-meta'
  readonly texturePath = 'assets/characters/zombie/star/zombie_star.png'
  readonly metadataPath = 'assets/characters/zombie/star/zombie_star.json'
}

export const ZOMBIE_STAR_DEFINITION = new ZombieStarDefinition()
