import { CharacterId } from '../config/keys'

export type CharacterState =
  | 'idle'
  | 'move'
  | 'run'
  | 'jump'
  | 'attack'
  | 'attack2'
  | 'attack3'
  | 'defend'
  | 'hurt'
  | 'death'
  | 'stunned'
  | 'rise'

export interface CharacterAnimationDefinition {
  name: string
  frames: number[]
  frameRate: number
  repeat: number
}

export type CharacterAnimationSet = Partial<
  Record<CharacterState, CharacterAnimationDefinition>
>

export interface CharacterBodyDefinition {
  width: number
  height: number
  offsetX: number
  offsetY: number
}

export type CharacterBodyProfileSet = Partial<
  Record<CharacterState, CharacterBodyDefinition>
>

export interface CharacterDefinition {
  id: CharacterId
  label: string
  sheetKey: string
  metadataKey: string
  texturePath: string
  metadataPath: string
  frameWidth: number
  frameHeight: number
  initialFrame: number
  scale: number
  moveSpeed: number
  jumpVelocity: number
  drag?: number
  airDrag?: number
  facingRight?: boolean
  canJump?: boolean
  runThreshold?: number
  body: CharacterBodyDefinition
  bodyProfiles?: CharacterBodyProfileSet
  animations: CharacterAnimationSet
}
