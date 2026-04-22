import * as Phaser from 'phaser'
import type { AbstractCharacterDefinition } from '../../characters/AbstractCharacterDefinition'
import { ZOMBIE_CHARACTER_DEFINITION } from './definitions/ZombieCharacterDefinition'

type ZombieActorState = 'rising' | 'patrolling'

/**
 * Non-playable zombie character actor that rises from the ground and then
 * patrols a bounded platform section back and forth.
 */
export class ZombieCharacterActor extends Phaser.Physics.Arcade.Sprite {
  private static readonly BODY_DEBUG_COLOR = 0xff2d55
  private static readonly BODY_DEBUG_ALPHA = 0.95
  private static readonly WORLD_RENDER_DEPTH = 20

  private readonly definition: AbstractCharacterDefinition
  private readonly patrolMinX: number
  private readonly patrolMaxX: number
  private readonly patrolSpeed: number
  private readonly bodyDebugGraphics: Phaser.GameObjects.Graphics
  private patrolDirection: 1 | -1 = 1
  private actorState: ZombieActorState = 'rising'

  /** World-chunk index this character belongs to — used for stale cleanup. */
  public readonly chunkIndex: number

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    definition: AbstractCharacterDefinition,
    patrolMinX: number,
    patrolMaxX: number,
    chunkIndex: number
  ) {
    super(scene, x, y, definition.sheetKey, definition.initialFrame)

    this.definition = definition
    this.patrolMinX = patrolMinX
    this.patrolMaxX = patrolMaxX
    this.chunkIndex = chunkIndex
    this.patrolSpeed =
      definition.moveSpeed *
      ZOMBIE_CHARACTER_DEFINITION.behavior.patrolSpeedMultiplier
    this.bodyDebugGraphics = scene.add.graphics().setDepth(120)

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setScale(definition.scale)
    this.setOrigin(0.5, 1)
    this.setDepth(ZombieCharacterActor.WORLD_RENDER_DEPTH)
    this.setCollideWorldBounds(false)

    const body = this.body as Phaser.Physics.Arcade.Body
    const b = definition.body
    body.setSize(b.width, b.height)
    body.setOffset(b.offsetX, b.offsetY)
    body.setAllowGravity(ZOMBIE_CHARACTER_DEFINITION.physics.enableGravity)
    body.setImmovable(false)
    body.reset(x, y)

    this.startRising()
  }

  public tick(): void {
    this.updateBodyDebugGraphics()

    if (this.actorState !== 'patrolling') {
      return
    }

    const body = this.body as Phaser.Physics.Arcade.Body

    if (this.x >= this.patrolMaxX && this.patrolDirection === 1) {
      this.patrolDirection = -1
      this.updateFacing()
    } else if (this.x <= this.patrolMinX && this.patrolDirection === -1) {
      this.patrolDirection = 1
      this.updateFacing()
    }

    body.setVelocityX(this.patrolDirection * this.patrolSpeed)
  }

  private startRising(): void {
    const riseState = ZOMBIE_CHARACTER_DEFINITION.behavior.riseAnimationState
    const riseAnim = riseState
      ? this.definition.animations[riseState]
      : undefined

    if (riseAnim) {
      this.play(riseAnim.name)
      this.once(
        Phaser.Animations.Events.ANIMATION_COMPLETE,
        this.onRiseComplete,
        this
      )
    } else {
      this.onRiseComplete()
    }
  }

  private onRiseComplete(): void {
    this.actorState = 'patrolling'
    this.startPatrolling()
  }

  private startPatrolling(): void {
    const moveState = ZOMBIE_CHARACTER_DEFINITION.behavior.moveAnimationState
    const moveAnim = moveState
      ? this.definition.animations[moveState]
      : undefined
    if (moveAnim) {
      this.play(moveAnim.name, true)
    }

    const body = this.body as Phaser.Physics.Arcade.Body
    const clampedX = Phaser.Math.Clamp(this.x, this.patrolMinX, this.patrolMaxX)
    if (clampedX !== this.x) {
      body.reset(clampedX, this.y)
    }

    this.updateFacing()
  }

  private updateFacing(): void {
    const facingRight = this.definition.facingRight ?? false
    if (this.patrolDirection > 0) {
      this.setFlipX(!facingRight)
    } else {
      this.setFlipX(facingRight)
    }
  }

  public override destroy(fromScene?: boolean): void {
    this.bodyDebugGraphics.destroy()
    super.destroy(fromScene)
  }

  private updateBodyDebugGraphics(): void {
    const body = this.body as Phaser.Physics.Arcade.Body
    if (!body) {
      return
    }

    this.bodyDebugGraphics.clear()
    this.bodyDebugGraphics.lineStyle(
      2,
      ZombieCharacterActor.BODY_DEBUG_COLOR,
      ZombieCharacterActor.BODY_DEBUG_ALPHA
    )
    this.bodyDebugGraphics.strokeRect(body.x, body.y, body.width, body.height)
  }
}
