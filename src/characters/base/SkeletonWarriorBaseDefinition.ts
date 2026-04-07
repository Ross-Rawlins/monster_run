import {
  AbstractCharacterDefinition,
  anim,
} from '../AbstractCharacterDefinition'
import { CharacterAnimationSet, CharacterBodyDefinition } from '../types'

/**
 * Abstract base for skeleton warrior variants using the 2_Sword weapon set.
 *
 * Sheet layout: 1920×1024, frame 64×64 → 30 cols × 16 rows (480 frames)
 * Frame index = (y/64) * 30 + (x/64)
 *
 * Animations used (all 2_Sword variants except where noted):
 *   Attack_Sword   x=0,    y=256 → row 4, col 0  → frames 120–125
 *   Attack2_Sword  x=1152, y=192 → row 3, col 18 → frames 108–113
 *   Idle_Sword     x=768,  y=256 → row 4, col 12 → frames 132–137
 *   Jump_Sword     x=1536, y=256 → row 4, col 24 → frames 144–149
 *   Run_Sword      x=384,  y=320 → row 5, col 6  → frames 156–161  (default/pirate/viking)
 *   Walk_Sword     x=1024, y=384 → row 6, col 16 → frames 196–201
 *   Dead           x=1408, y=832 → row 13, col 22 → frames 412–417
 *   Hurt           x=1792, y=832 → row 13, col 28 → frames 418–419
 *   Stunned        x=0,    y=896 → row 14, col 0  → frames 420–427
 *
 * Note: skeleton_warrior_knight's Run_Sword is packed at x=368 (non-64-aligned),
 * so that subclass overrides `animations` to use Walk frames for run.
 */
export abstract class SkeletonWarriorBaseDefinition extends AbstractCharacterDefinition {
  readonly frameWidth = 64
  readonly frameHeight = 64
  readonly initialFrame = 132
  readonly scale = 1
  readonly moveSpeed = 220
  readonly jumpVelocity = 520
  readonly canJump = false
  readonly runThreshold = 30

  readonly body: CharacterBodyDefinition = {
    width: 24,
    height: 56,
    offsetX: 20,
    offsetY: 4,
  }

  get animations(): CharacterAnimationSet {
    const p = this.id
    return {
      idle: anim(`${p}-idle`, [132, 133, 134, 135, 136, 137], 8, -1),
      move: anim(`${p}-move`, [196, 197, 198, 199, 200, 201], 10, -1),
      run: anim(`${p}-run`, [156, 157, 158, 159, 160, 161], 14, -1),
      jump: anim(`${p}-jump`, [144, 145, 146, 147, 148, 149], 10, 0),
      attack: anim(`${p}-attack`, [120, 121, 122, 123, 124, 125], 12, 0),
      attack2: anim(`${p}-attack2`, [108, 109, 110, 111, 112, 113], 12, 0),
      death: anim(`${p}-death`, [412, 413, 414, 415, 416, 417], 10, 0),
      hurt: anim(`${p}-hurt`, [418, 419], 10, 0),
      stunned: anim(
        `${p}-stunned`,
        [420, 421, 422, 423, 424, 425, 426, 427],
        8,
        -1
      ),
    }
  }
}
