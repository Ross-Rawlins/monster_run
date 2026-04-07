import * as Phaser from 'phaser'
import { CharacterAnimationDefinition } from './types'
import { AbstractCharacterDefinition } from './AbstractCharacterDefinition'

function registerAnimation(
  animationManager: Phaser.Animations.AnimationManager,
  sheetKey: string,
  definition?: CharacterAnimationDefinition
): void {
  if (!definition || animationManager.exists(definition.name)) {
    return
  }

  animationManager.create({
    key: definition.name,
    frames: definition.frames.map((frame) => ({ key: sheetKey, frame })),
    frameRate: definition.frameRate,
    repeat: definition.repeat,
  })
}

export function registerCharacterAnimations(
  animationManager: Phaser.Animations.AnimationManager,
  character: AbstractCharacterDefinition
): void {
  for (const def of Object.values(character.animations)) {
    registerAnimation(animationManager, character.sheetKey, def)
  }
}
