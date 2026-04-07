import { CHARACTER_KEYS } from '../../../config/keys'
import { ZombieBaseDefinition } from '../../base/ZombieBaseDefinition'

export class ZombieSoldierDefinition extends ZombieBaseDefinition {
  readonly id = CHARACTER_KEYS.ZOMBIE_SOLDIER
  readonly label = 'Zombie (Soldier)'
  readonly sheetKey = 'zombie-soldier'
  readonly metadataKey = 'zombie-soldier-meta'
  readonly texturePath = 'assets/characters/zombie/soldier/zombie_soldier.png'
  readonly metadataPath = 'assets/characters/zombie/soldier/zombie_soldier.json'
}

export const ZOMBIE_SOLDIER_DEFINITION = new ZombieSoldierDefinition()
