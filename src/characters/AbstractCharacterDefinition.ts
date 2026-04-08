import {
  CharacterAnimationDefinition,
  CharacterAnimationSet,
  CharacterBodyDefinition,
  CharacterBodyProfileSet,
  CharacterDefinition,
  CharacterState,
} from './types'
import { CharacterId } from '../config/keys'
import { resolveBodyProfile } from './bodyProfiles'

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
  readonly runSpeedMultiplier: number = 1.45
  readonly runJumpBoost: number = 1.18

  /** Y pixel in source-frame coordinates where the feet of the sprite land.
   *  Used by buildBody() to auto-compute offsetY = frameGroundLine - height. */
  readonly frameGroundLine?: number = undefined

  /** Fixed left-edge X offset in source-frame pixels for the collision body.
   *  When set, buildBody() uses this value for offsetX regardless of body width.
   *  When omitted, offsetX is auto-centred: Math.round((frameWidth - width) / 2). */
  readonly bodyAnchorX?: number = undefined

  /** Build a fully-specified collision body from just width and height.
   *  offsetX is derived from bodyAnchorX (if set) or frame-centre.
   *  offsetY is derived from frameGroundLine (if set) or frameHeight. */
  public buildBody(width: number, height: number): CharacterBodyDefinition {
    const groundLine = this.frameGroundLine ?? this.frameHeight
    const offsetX =
      this.bodyAnchorX ?? Math.round((this.frameWidth - width) / 2)
    return { width, height, offsetX, offsetY: groundLine - height }
  }

  public get bodyProfiles(): CharacterBodyProfileSet | undefined {
    return undefined
  }

  public getBodyForState(state: CharacterState): CharacterBodyDefinition {
    return resolveBodyProfile(this.body, this.bodyProfiles, state)
  }
}
