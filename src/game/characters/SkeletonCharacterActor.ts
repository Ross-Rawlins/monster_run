import * as Phaser from 'phaser'
import type { AbstractCharacterDefinition } from '../../characters/AbstractCharacterDefinition'
import { TILE_SIZE_PX } from '../tilemaps/TileTypes'

type SkeletonActorState = 'chasing' | 'gap-dying' | 'dead'

/**
 * Callback used to test whether a world-space point sits on a solid tile.
 * GameScene provides a closure over all currently active chunk tile grids.
 */
export type TileSolidQuery = (worldX: number, worldY: number) => boolean

export interface SkeletonActorOptions {
  chunkIndex: number
  tileSizePx: number
  worldBottom: number
  /** Y world-coordinate below which a falling skeleton triggers its gap-death sequence. */
  occlusionBoundaryY: number
  tileQueryFn: TileSolidQuery
}

/**
 * Non-playable skeleton character actor that relentlessly pursues the hero
 * by always moving left.
 *
 * Behaviour:
 *  - Continuously walks/runs left at full move speed.
 *  - Detects walls (body.blocked.left) and gaps ahead (tile query lookahead)
 *    and jumps to clear them.
 *  - Falls under gravity like the player. If it falls off the bottom of the
 *    world it plays its death animation and self-destructs.
 *  - Cannot be stopped by patrol bounds — it will cross chunk boundaries.
 */
export class SkeletonCharacterActor extends Phaser.Physics.Arcade.Sprite {
  private static readonly BODY_DEBUG_COLOR = 0x00e5ff
  private static readonly BODY_DEBUG_ALPHA = 1
  private static readonly WORLD_RENDER_DEPTH = 20
  private static readonly CHASE_SPEED_MULTIPLIER = 0.38
  private static readonly JUMP_VELOCITY_MULTIPLIER = 0.46
  private static readonly GAP_LOOKAHEAD_TILES = 0.55
  private static readonly JUMP_COOLDOWN_FRAMES = 150

  private readonly definition: AbstractCharacterDefinition
  private readonly chaseSpeed: number
  private readonly jumpVelocityY: number
  private readonly tileQueryFn: TileSolidQuery
  private readonly tileSizePx: number
  private readonly worldBottom: number
  private readonly occlusionBoundaryY: number
  private readonly bodyDebugGraphics: Phaser.GameObjects.Graphics

  private actorState: SkeletonActorState = 'chasing'
  private jumpCooldown = 0
  private wasAirborne = false
  private hasActivatedInView = false

  /** World-chunk index this character belongs to — used for stale cleanup. */
  public readonly chunkIndex: number

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    definition: AbstractCharacterDefinition,
    options: SkeletonActorOptions
  ) {
    super(scene, x, y, definition.sheetKey, definition.initialFrame)

    this.definition = definition
    this.chunkIndex = options.chunkIndex
    this.tileSizePx = options.tileSizePx
    this.worldBottom = options.worldBottom
    this.occlusionBoundaryY = options.occlusionBoundaryY
    this.tileQueryFn = options.tileQueryFn
    this.bodyDebugGraphics = scene.add.graphics().setDepth(120)

    // renderScale mirrors the tile layer: tileSizePx / TILE_SIZE_PX.
    // Source character art is ~32px = 2 tiles at 16px/tile, so at any
    // runtime resolution the art stays 2 tiles tall.
    //
    // body.setSize and body.setOffset both use source-frame pixel values.
    // Phaser applies the sprite scale when resolving the Arcade body.
    const renderScale = options.tileSizePx / TILE_SIZE_PX
    this.chaseSpeed =
      definition.moveSpeed *
      SkeletonCharacterActor.CHASE_SPEED_MULTIPLIER *
      renderScale
    this.jumpVelocityY =
      definition.jumpVelocity *
      SkeletonCharacterActor.JUMP_VELOCITY_MULTIPLIER *
      renderScale

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setScale(renderScale)
    this.setOrigin(0.5, 1)
    this.setDepth(SkeletonCharacterActor.WORLD_RENDER_DEPTH)
    this.setCollideWorldBounds(false)

    // Skeletons always move left; warrior sprites naturally face left (facingRight = false),
    // so no flip is needed.
    const facingRight = definition.facingRight ?? false
    this.setFlipX(facingRight)

    const body = this.body as Phaser.Physics.Arcade.Body
    const b = definition.body
    body.setSize(b.width, b.height)
    body.setOffset(b.offsetX, b.offsetY)
    body.setAllowGravity(false)
    body.setImmovable(false)
    body.reset(x, y)
    body.setVelocity(0, 0)

    this.playIdleAnimation()
  }

  public tick(camera?: Phaser.Cameras.Scene2D.Camera): void {
    this.updateBodyDebugGraphics()

    if (this.actorState === 'dead' || this.actorState === 'gap-dying') {
      return
    }

    if (!this.hasActivatedInView) {
      if (!camera || !this.isInCameraView(camera)) {
        return
      }

      this.activateInView()
    }

    if (this.y > this.occlusionBoundaryY) {
      this.dieInGap()
      return
    }

    if (this.y > this.worldBottom + this.tileSizePx * 2) {
      this.die()
      return
    }

    const body = this.body as Phaser.Physics.Arcade.Body

    if (this.jumpCooldown > 0) {
      this.jumpCooldown -= 1
    }

    const onGround = body.blocked.down

    if (!onGround) {
      this.playAirborneAnimation()
    }

    // Resume walk animation when transitioning from air to ground
    if (this.wasAirborne && onGround) {
      this.playChargeAnimation()
    }
    this.wasAirborne = !onGround

    // Always drive left
    body.setVelocityX(-this.chaseSpeed)

    // Evaluate jump trigger only while grounded and cooldown has expired
    if (onGround && this.jumpCooldown <= 0 && body.velocity.y >= -5) {
      if (body.blocked.left || this.hasGapAhead()) {
        this.jump()
      }
    }
  }

  private playWalkAnimation(): void {
    const moveAnim = this.definition.animations.move
    if (moveAnim) {
      this.play(moveAnim.name, true)
    }
  }

  private playIdleAnimation(): void {
    const idleAnim = this.definition.animations.idle
    if (idleAnim) {
      this.play(idleAnim.name, true)
    }
  }

  private playChargeAnimation(): void {
    const runAnim = this.definition.animations.run
    if (runAnim) {
      this.play(runAnim.name, true)
      return
    }

    this.playWalkAnimation()
  }

  private playAirborneAnimation(): void {
    const jumpAnim = this.definition.animations.jump
    if (!jumpAnim) {
      return
    }

    if (this.anims.currentAnim?.key === jumpAnim.name) {
      return
    }

    this.play(jumpAnim.name, true)
  }

  private isInCameraView(camera: Phaser.Cameras.Scene2D.Camera): boolean {
    return camera.worldView.contains(this.x, this.y)
  }

  private activateInView(): void {
    this.hasActivatedInView = true

    const body = this.body as Phaser.Physics.Arcade.Body
    body.reset(this.x, this.y)
    body.setAllowGravity(true)

    this.playChargeAnimation()
  }

  private hasGapAhead(): boolean {
    // Sample one tile-and-a-bit to the left of the skeleton's centre, just
    // below the bottom of its feet, to predict an upcoming gap.
    const lookX =
      this.x - this.tileSizePx * SkeletonCharacterActor.GAP_LOOKAHEAD_TILES
    const lookY = this.y + this.tileSizePx * 0.3
    return !this.tileQueryFn(lookX, lookY)
  }

  private jump(): void {
    const body = this.body as Phaser.Physics.Arcade.Body
    body.setVelocityY(-this.jumpVelocityY)
    this.jumpCooldown = SkeletonCharacterActor.JUMP_COOLDOWN_FRAMES
    this.wasAirborne = true
    this.playAirborneAnimation()
  }

  /**
   * Triggered when the skeleton falls into a ground gap and crosses the
   * occlusion boundary. The skeleton freezes at the boundary Y, plays its
   * death animation, then the final frame fades out before destruction.
   */
  private dieInGap(): void {
    this.actorState = 'gap-dying'

    const body = this.body as Phaser.Physics.Arcade.Body
    body.setVelocity(0, 0)
    body.setAllowGravity(false)
    // Clamp to exactly the boundary so the animation plays at the screen edge.
    body.reset(this.x, this.occlusionBoundaryY)

    const deathAnim = this.definition.animations.death
    if (deathAnim) {
      this.play(deathAnim.name)
      this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        this.freezeAndFade()
      })
    } else {
      this.freezeAndFade()
    }
  }

  /**
   * Freezes the skeleton at its current position and fades the final frame
   * to transparent before destroying the sprite.
   */
  private freezeAndFade(): void {
    this.actorState = 'dead'

    const body = this.body as Phaser.Physics.Arcade.Body
    body.setVelocity(0, 0)
    body.setAllowGravity(false)

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 800,
      ease: 'Linear',
      onComplete: () => {
        this.destroy()
      },
    })
  }

  private die(): void {
    this.actorState = 'dead'

    const body = this.body as Phaser.Physics.Arcade.Body
    body.setVelocityX(0)
    body.setVelocityY(0)
    body.setAllowGravity(false)

    const deathAnim = this.definition.animations.death
    if (deathAnim) {
      this.play(deathAnim.name)
      this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        this.destroy()
      })
    } else {
      this.destroy()
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
      3,
      SkeletonCharacterActor.BODY_DEBUG_COLOR,
      SkeletonCharacterActor.BODY_DEBUG_ALPHA
    )
    this.bodyDebugGraphics.strokeRect(body.x, body.y, body.width, body.height)
  }
}
