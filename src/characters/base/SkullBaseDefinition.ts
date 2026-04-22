import {
  AbstractCharacterDefinition,
  anim,
} from '../AbstractCharacterDefinition'
import { defineBodyProfiles } from '../bodyProfiles'
import { CharacterAnimationSet, CharacterBodyDefinition } from '../types'

/**
 * Abstract base for skull variants.
 *
 * Sheet layout: 1920×64, frame 64×64 → 30 frames.
 * We intentionally wire a small, practical animation subset for previewing.
 */
export abstract class SkullBaseDefinition extends AbstractCharacterDefinition {
  readonly frameWidth = 64
  readonly frameHeight = 64
  readonly initialFrame = 18
  readonly scale = 1
  readonly moveSpeed = 120
  readonly jumpVelocity = 300
  readonly canJump = false

  readonly body: CharacterBodyDefinition = {
    width: 16,
    height: 16,
    offsetX: 24,
    offsetY: 48,
  }

  get bodyProfiles() {
    return defineBodyProfiles(this.body)
  }

  get animations(): CharacterAnimationSet {
    const p = this.id
    return {
      attack: anim(`${p}-attack`, [0, 1, 2, 3, 4, 5], 10, 0),
      death: anim(`${p}-death`, [6, 7, 8, 9, 10, 11], 10, 0),
      hurt: anim(`${p}-hurt`, [12, 13, 14, 15, 16, 17], 10, 0),
      // JSON metadata only gives frame order, not animation labels.
      // Narrow the preview to frames 1-4 to isolate a possible idle loop.
      idle: anim(`${p}-idle`, [0, 1, 2, 3], 4, -1),
      move: anim(`${p}-move`, [24, 25, 26, 27, 28, 29], 10, -1),
      run: anim(`${p}-run`, [24, 25, 26, 27, 28, 29], 14, -1),
    }
  }
}
