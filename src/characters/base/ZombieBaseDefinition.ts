import {
  AbstractCharacterDefinition,
  anim,
} from '../AbstractCharacterDefinition'
import { CharacterAnimationSet, CharacterBodyDefinition } from '../types'

/**
 * Abstract base for all zombie variants.
 *
 * Sheet layout: 1664×192, frame 64×64 → 26 cols × 3 rows (78 frames)
 *
 * Row 0 (y=0,  base=0):
 *   Attack1  x=0    → frames 0–5   (6 frames)
 *   Attack2  x=384  → frames 6–11  (6 frames)
 *   Dead     x=768  → frames 12–17 (6 frames)
 *   Hurt     x=1152 → frames 18–23 (6 frames)
 *
 * Row 1 (y=64, base=26):
 *   Idle     x=0    → frames 26–31 (6 frames)
 *   Run      x=384  → frames 32–37 (6 frames)
 *   Walk     x=768  → frames 38–43 (6 frames)
 *   Stunned  x=1152 → frames 44–51 (8 frames)
 *
 * Row 2 (y=128, base=52):
 *   Rise     x=0    → frames 52–74 (23 frames)
 */
export abstract class ZombieBaseDefinition extends AbstractCharacterDefinition {
  readonly frameWidth = 64
  readonly frameHeight = 64
  readonly initialFrame = 26
  readonly scale = 1
  readonly moveSpeed = 180
  readonly jumpVelocity = 500
  readonly canJump = false
  readonly runThreshold = 30

  readonly body: CharacterBodyDefinition = {
    width: 26,
    height: 56,
    offsetX: 19,
    offsetY: 4,
  }

  get animations(): CharacterAnimationSet {
    const p = this.id
    return {
      idle: anim(`${p}-idle`, [26, 27, 28, 29, 30, 31], 8, -1),
      move: anim(`${p}-move`, [38, 39, 40, 41, 42, 43], 10, -1),
      run: anim(`${p}-run`, [32, 33, 34, 35, 36, 37], 14, -1),
      attack: anim(`${p}-attack1`, [0, 1, 2, 3, 4, 5], 10, 0),
      attack2: anim(`${p}-attack2`, [6, 7, 8, 9, 10, 11], 10, 0),
      death: anim(`${p}-death`, [12, 13, 14, 15, 16, 17], 10, 0),
      hurt: anim(`${p}-hurt`, [18, 19, 20, 21, 22, 23], 10, 0),
      stunned: anim(`${p}-stunned`, [44, 45, 46, 47, 48, 49, 50, 51], 8, -1),
      rise: anim(
        `${p}-rise`,
        Array.from({ length: 23 }, (_, i) => 52 + i),
        10,
        0
      ),
    }
  }
}
