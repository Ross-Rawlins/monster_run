import {
  AbstractCharacterDefinition,
  anim,
} from '../AbstractCharacterDefinition'
import { defineBodyProfiles } from '../bodyProfiles'
import { CharacterAnimationSet, CharacterBodyDefinition } from '../types'

/**
 * Abstract base for skeleton mage variants.
 *
 * Sheet layout: 896×192, frame 64×64 → 14 cols × 3 rows (42 frames)
 * Frame index = (y/64) * 14 + (x/64)
 *
 * Row 0 (y=0,   base=0):
 *   Attack  x=0   → frames 0–5   (6 frames)
 *   Dead    x=384 → frames 6–11  (6 frames)
 *   Hurt    x=768 → frames 12–13 (2 frames)
 *
 * Row 1 (y=64,  base=14):
 *   Idle    x=0   → frames 14–19 (6 frames)
 *   Jump    x=384 → frames 20–25 (6 frames)
 *
 * Row 2 (y=128, base=28):
 *   Run     x=0   → frames 28–33 (6 frames)
 *   Walk    x=384 → frames 34–39 (6 frames)
 */
export abstract class SkeletonMageBaseDefinition extends AbstractCharacterDefinition {
  readonly frameWidth = 64
  readonly frameHeight = 64
  readonly initialFrame = 14
  readonly scale = 1
  readonly moveSpeed = 200
  readonly jumpVelocity = 520
  readonly canJump = false
  readonly runThreshold = 30

  readonly body: CharacterBodyDefinition = {
    width: 22,
    height: 56,
    offsetX: 21,
    offsetY: 4,
  }

  get bodyProfiles() {
    return defineBodyProfiles(this.body)
  }

  get animations(): CharacterAnimationSet {
    const p = this.id
    return {
      idle: anim(`${p}-idle`, [14, 15, 16, 17, 18, 19], 8, -1),
      move: anim(`${p}-move`, [34, 35, 36, 37, 38, 39], 10, -1),
      run: anim(`${p}-run`, [28, 29, 30, 31, 32, 33], 14, -1),
      jump: anim(`${p}-jump`, [20, 21, 22, 23, 24, 25], 10, 0),
      attack: anim(`${p}-attack`, [0, 1, 2, 3, 4, 5], 12, 0),
      death: anim(`${p}-death`, [6, 7, 8, 9, 10, 11], 10, 0),
      hurt: anim(`${p}-hurt`, [12, 13], 10, 0),
    }
  }
}
