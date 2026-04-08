import { CharacterId } from '../config/keys'
import { AbstractCharacterDefinition } from './AbstractCharacterDefinition'
// import { KNIGHT_DEFINITION } from './definitions/KnightCharacter' // temporarily disabled
import { SKELETON_DEFAULT_DEFINITION } from './definitions/skeleton/warrior/SkeletonDefaultDefinition'
import { SKELETON_KNIGHT_DEFINITION } from './definitions/skeleton/warrior/SkeletonKnightDefinition'
import { SKELETON_PIRATE_DEFINITION } from './definitions/skeleton/warrior/SkeletonPirateDefinition'
import { SKELETON_VIKING_DEFINITION } from './definitions/skeleton/warrior/SkeletonVikingDefinition'
import { SKELETON_DEFAULT_DEFINITION as MAGE_DEFAULT } from './definitions/skeleton/mage/SkeletonDefaultDefinition'
import { SKELETON_HOODED_DEFINITION } from './definitions/skeleton/mage/SkeletonHoodedDefinition'
import { SKELETON_SORCERER_DEFINITION } from './definitions/skeleton/mage/SkeletonSorcererDefinition'
import { SKELETON_WIZARD_DEFINITION } from './definitions/skeleton/mage/SkeletonWizardDefinition'
import { ZOMBIE_DEFAULT_DEFINITION } from './definitions/zombie/ZombieDefaultDefinition'
import { ZOMBIE_BEANIE_DEFINITION } from './definitions/zombie/ZombieBeanieDefinition'
import { ZOMBIE_BRAIN_DEFINITION } from './definitions/zombie/ZombieBrainDefinition'
import { ZOMBIE_CAP_DEFINITION } from './definitions/zombie/ZombieCapDefinition'
import { ZOMBIE_COWBOY_DEFINITION } from './definitions/zombie/ZombieCowboyDefinition'
import { ZOMBIE_GLASSES_DEFINITION } from './definitions/zombie/ZombieGlassesDefinition'
import { ZOMBIE_GUARD_DEFINITION } from './definitions/zombie/ZombieGuardDefinition'
import { ZOMBIE_HAIR1_DEFINITION } from './definitions/zombie/ZombieHair1Definition'
import { ZOMBIE_HAIR2_DEFINITION } from './definitions/zombie/ZombieHair2Definition'
import { ZOMBIE_HAIR3_DEFINITION } from './definitions/zombie/ZombieHair3Definition'
import { ZOMBIE_HAIR4_DEFINITION } from './definitions/zombie/ZombieHair4Definition'
import { ZOMBIE_HAIR5_DEFINITION } from './definitions/zombie/ZombieHair5Definition'
import { ZOMBIE_MUSHROOM_DEFINITION } from './definitions/zombie/ZombieMushroomDefinition'
import { ZOMBIE_PIRATE_DEFINITION } from './definitions/zombie/ZombiePirateDefinition'
import { ZOMBIE_SCUBA_DEFINITION } from './definitions/zombie/ZombieScubaDefinition'
import { ZOMBIE_SOLDIER_DEFINITION } from './definitions/zombie/ZombieSoldierDefinition'
import { ZOMBIE_STAR_DEFINITION } from './definitions/zombie/ZombieStarDefinition'
import { ZOMBIE_TOPHAT_DEFINITION } from './definitions/zombie/ZombieTophatDefinition'
import { ZOMBIE_TOQUE_DEFINITION } from './definitions/zombie/ZombieToqueDefinition'
import { ZOMBIE_VIKING_DEFINITION } from './definitions/zombie/ZombieVikingDefinition'

const characterDefinitions: AbstractCharacterDefinition[] = [
  // KNIGHT_DEFINITION, // temporarily disabled — focusing on terrain/background
  SKELETON_DEFAULT_DEFINITION,
  SKELETON_KNIGHT_DEFINITION,
  SKELETON_PIRATE_DEFINITION,
  SKELETON_VIKING_DEFINITION,
  MAGE_DEFAULT,
  SKELETON_HOODED_DEFINITION,
  SKELETON_SORCERER_DEFINITION,
  SKELETON_WIZARD_DEFINITION,
  ZOMBIE_DEFAULT_DEFINITION,
  ZOMBIE_BEANIE_DEFINITION,
  ZOMBIE_BRAIN_DEFINITION,
  ZOMBIE_CAP_DEFINITION,
  ZOMBIE_COWBOY_DEFINITION,
  ZOMBIE_GLASSES_DEFINITION,
  ZOMBIE_GUARD_DEFINITION,
  ZOMBIE_HAIR1_DEFINITION,
  ZOMBIE_HAIR2_DEFINITION,
  ZOMBIE_HAIR3_DEFINITION,
  ZOMBIE_HAIR4_DEFINITION,
  ZOMBIE_HAIR5_DEFINITION,
  ZOMBIE_MUSHROOM_DEFINITION,
  ZOMBIE_PIRATE_DEFINITION,
  ZOMBIE_SCUBA_DEFINITION,
  ZOMBIE_SOLDIER_DEFINITION,
  ZOMBIE_STAR_DEFINITION,
  ZOMBIE_TOPHAT_DEFINITION,
  ZOMBIE_TOQUE_DEFINITION,
  ZOMBIE_VIKING_DEFINITION,
]

export const CharacterRegistry = {
  getAll(): AbstractCharacterDefinition[] {
    return characterDefinitions.slice()
  },

  getById(id: CharacterId): AbstractCharacterDefinition {
    const definition = characterDefinitions.find((entry) => entry.id === id)

    if (!definition) {
      throw new Error('Unknown character definition: ' + id)
    }

    return definition
  },
}
