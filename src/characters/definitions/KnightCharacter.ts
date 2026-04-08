import { CHARACTER_KEYS } from '../../config/keys'
import {
  AbstractCharacterDefinition,
  anim,
} from '../AbstractCharacterDefinition'
import { CharacterAnimationSet, CharacterBodyDefinition } from '../types'
import { defineBodyProfiles } from '../bodyProfiles'

/**
 * Knight Character Definition
 *
 * PNG: ~1728x336, sub-frames: 96x84 → 18 cols × 4 rows
 * Frame index = (row * 18) + col, where row = y/84, col = x/96
 *
 * Key animations (from knight.json):
 *   ATTACK 1 : x=0,    y=0   → row 0, col 0  → frames 0–5   (6 frames)
 *   ATTACK 2 : x=576,  y=0   → row 0, col 6  → frames 6–10  (5 frames)
 *   ATTACK 3 : x=1056, y=0   → row 0, col 11 → frames 11–16 (6 frames)
 *   DEATH    : x=0,    y=84  → row 1, col 0  → frames 18–29 (12 frames)
 *   DEFEND   : x=1152, y=84  → row 1, col 12 → frames 30–35 (6 frames)
 *   HURT     : x=0,    y=168 → row 2, col 0  → frames 36–39 (4 frames)
 *   IDLE     : x=384,  y=168 → row 2, col 4  → frames 40–46 (7 frames)
 *   JUMP     : x=1056, y=168 → row 2, col 11 → frames 47–51 (5 frames)
 *   RUN      : x=0,    y=252 → row 3, col 0  → frames 54–61 (8 frames)
 *   WALK     : x=768,  y=252 → row 3, col 8  → frames 62–69 (8 frames)
 */
export class KnightDefinition extends AbstractCharacterDefinition {
  readonly id = CHARACTER_KEYS.KNIGHT
  readonly label = 'Knight'
  readonly sheetKey = 'character-sheet-knight'
  readonly metadataKey = 'character-metadata-knight'
  readonly texturePath = 'assets/characters/knight/knight.png'
  readonly metadataPath = 'assets/characters/knight/knight.json'
  readonly frameWidth = 96
  readonly frameHeight = 84
  readonly initialFrame = 40
  readonly scale = 2
  readonly moveSpeed = 200
  readonly jumpVelocity = 430
  override readonly drag = 1200
  override readonly airDrag = 50
  override readonly facingRight = true
  override readonly canJump = true
  override readonly runThreshold = 10
  override readonly runJumpBoost = 1.28

  readonly body: CharacterBodyDefinition = {
    // Center the body on the grounded torso/legs so the feet sit on the ground plane.
    width: 30,
    height: 44,
    offsetX: 32,
    offsetY: 20,
  }

  get bodyProfiles() {
    return defineBodyProfiles(this.body, {
      run: {
        width: 31,
        offsetX: 31,
      },
      jump: {
        width: 28,
        height: 40,
        offsetX: 32,
        offsetY: 24,
      },
      attack: {
        width: 31,
        offsetX: 31,
      },
      attack2: {
        width: 33,
        offsetX: 30,
      },
      attack3: {
        width: 32,
        height: 46,
        offsetX: 30,
        offsetY: 18,
      },
      defend: {
        width: 29,
        height: 44,
        offsetX: 33,
      },
      death: {
        width: 38,
        height: 20,
        offsetX: 29,
        offsetY: 44,
      },
    })
  }

  readonly animations: CharacterAnimationSet = {
    idle: anim('knight-idle', [40, 41, 42, 43, 44, 45, 46], 7, -1),
    move: anim('knight-move', [62, 63, 64, 65, 66, 67, 68, 69], 10, -1),
    jump: anim('knight-jump', [47, 48, 49, 50, 51], 10, 0),
    run: anim('knight-run', [54, 55, 56, 57, 58, 59, 60, 61], 12, -1),
    attack: anim('knight-attack', [0, 1, 2, 3, 4, 5], 12, 0),
    attack2: anim('knight-attack2', [6, 7, 8, 9, 10], 12, 0),
    attack3: anim('knight-attack3', [11, 12, 13, 14, 15, 16], 12, 0),
    defend: anim('knight-defend', [30, 31, 32, 33, 34, 35], 10, 0),
    hurt: anim('knight-hurt', [36, 37, 38, 39], 10, 0),
    death: anim(
      'knight-death',
      [18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
      10,
      0
    ),
  }
}

export const KNIGHT_DEFINITION = new KnightDefinition()
