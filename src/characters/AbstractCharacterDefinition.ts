import {
  CharacterAnimationDefinition,
  CharacterAnimationSet,
  CharacterBodyDefinition,
  CharacterDefinition,
} from './types'
import { CharacterId } from '../config/keys'

export function anim(
  name: string,
  frames: number[],
  frameRate: number,
  repeat: number
): CharacterAnimationDefinition {
  return { name, frames, frameRate, repeat }
}

export abstract class AbstractCharacterDefinition implements CharacterDefinition {
  abstract readonly id: CharacterId
  abstract readonly label: string
  abstract readonly sheetKey: string
  abstract readonly metadataKey: string
  abstract readonly texturePath: string
  abstract readonly metadataPath: string
  abstract readonly frameWidth: number
  abstract readonly frameHeight: number
  abstract readonly initialFrame: number
  abstract readonly scale: number
  abstract readonly moveSpeed: number
  abstract readonly jumpVelocity: number
  abstract readonly body: CharacterBodyDefinition
  abstract readonly animations: CharacterAnimationSet

  readonly drag?: number = undefined
  readonly airDrag?: number = undefined
  readonly facingRight: boolean = false
  readonly canJump: boolean = true
  readonly runThreshold?: number = undefined
}
