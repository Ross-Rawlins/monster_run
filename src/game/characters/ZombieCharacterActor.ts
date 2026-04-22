import * as Phaser from 'phaser'
import type { AbstractCharacterDefinition } from '../../characters/AbstractCharacterDefinition'
import { ZOMBIE_CHARACTER_DEFINITION } from './definitions/ZombieCharacterDefinition'
import { TILE_SIZE_PX } from '../tilemaps/TileTypes'

type ZombieActorState = 'rising' | 'patrolling'

export interface ZombieActorOptions {
  patrolMinX: number
  patrolMaxX: number
  chunkIndex: number
  tileSizePx: number
}

/**
 * Non-playable zombie character actor that rises from the ground and then
 * patrols a bounded platform section back and forth.
 */
export class ZombieCharacterActor extends Phaser.Physics.Arcade.Sprite {
  private static readonly WORLD_RENDER_DEPTH = 20

  private readonly definition: AbstractCharacterDefinition
  private readonly patrolMinX: number
  private readonly patrolMaxX: number
  private readonly surfaceAlignedY: number
  private readonly patrolAlignedY: number
  private readonly patrolSpeed: number
  private readonly bodyDebugGraphics: Phaser.GameObjects.Graphics
  private hasActivatedInView = false
  private patrolDirection: 1 | -1 = 1
  private actorState: ZombieActorState = 'rising'

  /** World-chunk index this character belongs to — used for stale cleanup. */
  public readonly chunkIndex: number

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    definition: AbstractCharacterDefinition,
    options: ZombieActorOptions
  ) {
    super(scene, x, y, definition.sheetKey, definition.initialFrame)

    this.definition = definition
    this.patrolMinX = options.patrolMinX
    this.patrolMaxX = options.patrolMaxX
    this.surfaceAlignedY = y
    this.patrolAlignedY = y
    this.chunkIndex = options.chunkIndex

    const renderScaleX =
      (definition.widthInTiles * options.tileSizePx) / definition.frameWidth
    const renderScaleY =
      (definition.heightInTiles * options.tileSizePx) / definition.frameHeight
    const worldTileScale = options.tileSizePx / TILE_SIZE_PX
    // NOTE: body.setSize/setOffset take source (frame) pixel values. Phaser
    // automatically multiplies them by the sprite's scaleX/scaleY each frame,
    // so pre-multiplying by renderScale here would double-scale the body.
    this.patrolSpeed =
      definition.moveSpeed *
      ZOMBIE_CHARACTER_DEFINITION.behavior.patrolSpeedMultiplier *
      worldTileScale
    this.bodyDebugGraphics = scene.add.graphics().setDepth(120)

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setScale(renderScaleX, renderScaleY)
    this.setOrigin(0.5, 1)
    this.setDepth(ZombieCharacterActor.WORLD_RENDER_DEPTH)
    this.setCollideWorldBounds(false)

    const body = this.body as Phaser.Physics.Arcade.Body
    const b = definition.body
    body.setSize(b.width, b.height)
    body.setOffset(b.offsetX, b.offsetY)
    body.setAllowGravity(false)
    body.setImmovable(false)
    body.reset(x, y)
    body.setVelocity(0, 0)

    this.setVisible(false)
    this.bodyDebugGraphics.setVisible(false)
  }

  public tick(camera?: Phaser.Cameras.Scene2D.Camera): void {
    if (!this.hasActivatedInView) {
      if (!camera || !this.isInCameraView(camera)) {
        return
      }

      this.activateInView()
    }

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
    const body = this.body as Phaser.Physics.Arcade.Body
    body.reset(this.x, this.patrolAlignedY)
    body.setVelocity(0, 0)
    body.setAllowGravity(ZOMBIE_CHARACTER_DEFINITION.physics.enableGravity)

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
      body.reset(clampedX, this.patrolAlignedY)
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

  private isInCameraView(camera: Phaser.Cameras.Scene2D.Camera): boolean {
    return camera.worldView.contains(this.x, this.y)
  }

  private activateInView(): void {
    this.hasActivatedInView = true
    this.setVisible(true)

    const body = this.body as Phaser.Physics.Arcade.Body
    body.reset(this.x, this.surfaceAlignedY)
    body.setVelocity(0, 0)
    body.setAllowGravity(false)

    this.startRising()
  }

  public override destroy(fromScene?: boolean): void {
    this.bodyDebugGraphics.destroy()
    super.destroy(fromScene)
  }
}
