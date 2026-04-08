import * as Phaser from 'phaser'
import { CharacterRegistry } from '../characters/CharacterRegistry'
import PlayableCharacter from '../characters/PlayableCharacter'
import { INFINITE_RUNNER_COLORS } from '../config/colors'
import { CHARACTER_KEYS, SCENE_KEYS } from '../config/keys'
import { ParallaxBackgroundManager } from '../managers/ParallaxBackgroundManager'
import { ChunkManager } from '../world/ChunkManager'
import { calculateTileGrid } from '../world/ChunkBuilder'

type MoveDirection = -1 | 0 | 1

interface RunnerKeys extends Phaser.Types.Input.Keyboard.CursorKeys {
  attack: Phaser.Input.Keyboard.Key
  attack3: Phaser.Input.Keyboard.Key
  reset: Phaser.Input.Keyboard.Key
  grid: Phaser.Input.Keyboard.Key
  gridSize: Phaser.Input.Keyboard.Key
  collision: Phaser.Input.Keyboard.Key
}

export default class InfiniteRunnerScene extends Phaser.Scene {
  // Runner movement tuning for pixel-perfect iteration.
  private readonly movementConfig = {
    lockScreenRatio: 1 / 3,
    runDoubleTapWindowMs: 300,
    walkScrollSpeed: 460,
    runScrollSpeed: 780,
    airControlMultiplier: 0.85,
    airborneMomentumRetention: 0.985,
  }

  private keys!: RunnerKeys

  private parallaxManager!: ParallaxBackgroundManager

  private chunkManager!: ChunkManager

  private player!: PlayableCharacter

  /**
   * Invisible physics rectangle that keeps the player standing on the ground.
   * Positioned at groundTop so the top surface aligns with the tile layer.
   * Hidden by the tile visuals drawn on top.
   */
  private groundBody!: Phaser.GameObjects.Rectangle

  private previewScrollX = 0

  private lastTapDirection: MoveDirection = 0

  private lastTapAtMs = 0

  private runDirection: MoveDirection = 0

  private airborneScrollVelocity = 0

  private gridGraphics: Phaser.GameObjects.Graphics | null = null

  private collisionGraphics: Phaser.GameObjects.Graphics | null = null

  private isGridVisible = false

  private isCollisionVisible = true

  private tileRendered = 0 // Calculated based on scene height

  private gridCellSizes: number[] = []

  private gridCellSizeIndex = 1

  /** Y below which the player is considered to have fallen into a gap. */
  private deathZoneY = 0

  /** Y position of the top of the ground band (screen pixels). */
  private groundY = 0

  constructor() {
    super({ key: SCENE_KEYS.INFINITE_RUNNER })
  }

  public create(): void {
    const width = this.scale.width
    const height = this.scale.height

    // Calculate responsive tile grid: ensures at least 20 blocks fit vertically
    const grid = calculateTileGrid(height)
    this.tileRendered = grid.tileRendered

    // Set up grid cell size options for debug overlay (G key to cycle)
    this.gridCellSizes = [
      this.tileRendered / 2,
      this.tileRendered,
      this.tileRendered * 2,
    ]

    // Ground top aligns to the nearest tile boundary for clean tile rendering
    const rawGroundTop = height - this.tileRendered * 2
    this.groundY =
      Math.floor(rawGroundTop / this.tileRendered) * this.tileRendered
    this.deathZoneY = height + this.tileRendered * 2

    this.cameras.main.setBackgroundColor(INFINITE_RUNNER_COLORS.base)
    this.parallaxManager = new ParallaxBackgroundManager(
      this,
      width,
      this.tileRendered
    )
    this.physics.world.setBounds(0, -height * 4, width, height * 6)
    this.cameras.main.setBounds(0, 0, width, height)

    // ── Physics ground band ────────────────────────────────────────────────
    // A thin static rectangle at groundY so the player lands on the surface
    // tile row. The visible tiles are drawn on top by ChunkManager.
    this.groundBody = this.add
      .rectangle(
        width * 0.5,
        this.groundY,
        width,
        height - this.groundY,
        0x000000,
        0 // fully transparent — tiles are drawn over this
      )
      // Ground body must be top-aligned to groundY; default center origin causes a vertical offset.
      .setOrigin(0.5, 0)
      .setDepth(7)

    this.physics.add.existing(this.groundBody, true)

    // ── Chunk world ────────────────────────────────────────────────────────
    this.chunkManager = new ChunkManager(this, this.groundY, width)

    // ── Player ────────────────────────────────────────────────────────────
    const playerDriver = CharacterRegistry.getById(
      CHARACTER_KEYS.SKELETON_WARRIOR_DEFAULT
    )
    this.player = new PlayableCharacter(
      this,
      width * 0.25,
      this.groundY - this.tileRendered,
      playerDriver
    )
    this.player.setDepth(20).setVisible(false)
    this.physics.add.collider(this.player, this.groundBody)
    this.physics.add.collider(this.player, this.chunkManager.platformGroup)

    this.cameras.main.scrollX = 0

    const keyboard = this.input.keyboard

    if (!keyboard) {
      throw new Error('Keyboard input is unavailable in InfiniteRunnerScene')
    }

    this.keys = keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      attack: Phaser.Input.Keyboard.KeyCodes.A,
      attack3: Phaser.Input.Keyboard.KeyCodes.F,
      reset: Phaser.Input.Keyboard.KeyCodes.R,
      grid: Phaser.Input.Keyboard.KeyCodes.G,
      gridSize: Phaser.Input.Keyboard.KeyCodes.H,
      collision: Phaser.Input.Keyboard.KeyCodes.C,
    }) as RunnerKeys

    if (this.isGridVisible) {
      this.drawGridOverlay()
    }

    this.drawCollisionOverlay()

    // Cleanup on shutdown
    this.events.on('shutdown', () => {
      this.parallaxManager.destroy()
      this.chunkManager.destroy()
      this.clearGridOverlay()
      this.clearCollisionOverlay()
    })
  }

  public update(): void {
    const cursorKeys = this.keys
    const direction = this.getDirectionFromInput(cursorKeys)
    this.updateRunState(cursorKeys, direction)

    if (Phaser.Input.Keyboard.JustDown(cursorKeys.reset)) {
      this.scene.restart()
      return
    }

    if (Phaser.Input.Keyboard.JustDown(cursorKeys.grid)) {
      this.isGridVisible = !this.isGridVisible

      if (!this.isGridVisible) {
        this.clearGridOverlay()
      }
    }

    if (Phaser.Input.Keyboard.JustDown(cursorKeys.gridSize)) {
      this.gridCellSizeIndex =
        (this.gridCellSizeIndex + 1) % this.gridCellSizes.length

      if (this.isGridVisible) {
        this.drawGridOverlay()
      }
    }

    if (Phaser.Input.Keyboard.JustDown(cursorKeys.collision)) {
      this.isCollisionVisible = !this.isCollisionVisible

      if (!this.isCollisionVisible) {
        this.clearCollisionOverlay()
      }
    }

    // Respawn if player fell into a gap
    if (this.player.y > this.deathZoneY) {
      this.scene.restart()
      return
    }

    this.updateForcedGroundMotionState(direction)

    this.player.applyHorizontalInput(direction)
    this.handleJumpAndAttackInput(cursorKeys)

    this.player.refreshAnimationState()

    this.updateScrollAndLock(direction)

    this.snapPlayerToGround()
  }

  private snapPlayerToGround(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body

    // Keep grounded frames flush with the collision plane to avoid visual hover on pixel-art sprites.
    if (!body.blocked.down || body.velocity.y !== 0) {
      return
    }

    const delta = this.groundY - body.bottom

    if (Math.abs(delta) <= 2) {
      this.player.setY(this.player.y + delta)
      body.updateFromGameObject()
    }
  }

  private updateForcedGroundMotionState(direction: MoveDirection): void {
    if (direction === 0) {
      this.player.setForcedGroundMotionState()
      return
    }

    if (this.runDirection === direction) {
      this.player.setForcedGroundMotionState('run')
      return
    }

    this.player.setForcedGroundMotionState('move')
  }

  private handleJumpAndAttackInput(cursorKeys: RunnerKeys): void {
    if (
      Phaser.Input.Keyboard.JustDown(cursorKeys.up) ||
      Phaser.Input.Keyboard.JustDown(cursorKeys.space)
    ) {
      this.player.tryJump()
    }

    if (Phaser.Input.Keyboard.JustDown(cursorKeys.attack)) {
      this.player.triggerAction(this.getPrimaryAttackState())
    }

    if (Phaser.Input.Keyboard.JustDown(cursorKeys.attack3)) {
      this.player.triggerAction('attack3')
    }
  }

  private getPrimaryAttackState(): 'attack' | 'attack2' | 'attack3' {
    if (!this.player.isGrounded()) {
      return 'attack3'
    }

    if (this.player.isRunning()) {
      return 'attack2'
    }

    return 'attack'
  }

  private updateScrollAndLock(direction: MoveDirection): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body
    const isGrounded = body.blocked.down
    const isRunIntent =
      this.runDirection !== 0 && direction === this.runDirection
    const rawScrollSpeed = this.calculateScrollSpeed(direction, isGrounded)
    const isGroundAttackActive = this.player.isAttackActive() && isGrounded
    const scrollSpeed = isGroundAttackActive ? 0 : rawScrollSpeed

    if (isGroundAttackActive) {
      this.airborneScrollVelocity = 0
    }
    this.previewScrollX = Math.max(
      0,
      this.previewScrollX + scrollSpeed * this.game.loop.delta * 0.001
    )
    this.previewScrollX = Math.round(this.previewScrollX)

    const playerWorldX = this.previewScrollX + this.player.x
    const isPlayerInGap = this.chunkManager.isPlayerInGap(playerWorldX)
    const groundBody = this.groundBody.body as Phaser.Physics.Arcade.StaticBody
    groundBody.enable = !isPlayerInGap

    const lockOffsetX = this.scale.width * this.movementConfig.lockScreenRatio
    this.player.setX(Math.round(lockOffsetX))
    body.setVelocityX(0)

    this.parallaxManager.update(this.previewScrollX)
    this.chunkManager.update(this.previewScrollX)

    if (this.isGridVisible) {
      this.drawGridOverlay()
    }

    if (this.isCollisionVisible) {
      this.drawCollisionOverlay()
    }

    this.updateTuningHud(direction, isRunIntent, isGrounded, scrollSpeed)
  }

  private calculateScrollSpeed(
    direction: MoveDirection,
    isGrounded: boolean
  ): number {
    const isRunIntent =
      this.runDirection !== 0 && direction === this.runDirection
    const baseSpeed = isRunIntent
      ? this.movementConfig.runScrollSpeed
      : this.movementConfig.walkScrollSpeed

    if (isGrounded) {
      this.airborneScrollVelocity = direction * baseSpeed
      return this.airborneScrollVelocity
    }

    if (direction === 0) {
      this.airborneScrollVelocity *=
        this.movementConfig.airborneMomentumRetention
    } else {
      this.airborneScrollVelocity =
        direction * baseSpeed * this.movementConfig.airControlMultiplier
    }

    return this.airborneScrollVelocity
  }

  private updateTuningHud(
    _direction: MoveDirection,
    _isRunning: boolean,
    _isGrounded: boolean,
    _scrollSpeed: number
  ): void {
    // HUD intentionally disabled for clean visual layout while tuning terrain.
  }

  private drawGridOverlay(): void {
    this.clearGridOverlay()

    const width = this.scale.width
    const height = this.scale.height
    const cellSize = this.gridCellSizes[this.gridCellSizeIndex]
    const offsetX = ((this.previewScrollX % cellSize) + cellSize) % cellSize
    const top = -cellSize
    const bottom = height + cellSize

    const graphics = this.add.graphics()
    graphics.setDepth(200)
    graphics.lineStyle(1, 0x39ff14, 0.7)

    for (let x = -offsetX; x <= width; x += cellSize) {
      graphics.beginPath()
      graphics.moveTo(Math.round(x), top)
      graphics.lineTo(Math.round(x), bottom)
      graphics.strokePath()
    }

    for (let y = top; y <= bottom; y += cellSize) {
      graphics.beginPath()
      graphics.moveTo(0, Math.round(y))
      graphics.lineTo(width, Math.round(y))
      graphics.strokePath()
    }

    this.gridGraphics = graphics
  }

  private clearGridOverlay(): void {
    if (this.gridGraphics) {
      this.gridGraphics.destroy()
      this.gridGraphics = null
    }
  }

  private drawCollisionOverlay(): void {
    this.clearCollisionOverlay()

    const graphics = this.add.graphics()
    graphics.setDepth(210)

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body
    graphics.lineStyle(2, 0xff3366, 0.95)
    graphics.strokeRect(
      Math.round(playerBody.x),
      Math.round(playerBody.y),
      Math.round(playerBody.width),
      Math.round(playerBody.height)
    )

    const groundBody = this.groundBody.body as Phaser.Physics.Arcade.StaticBody
    if (groundBody.enable) {
      graphics.lineStyle(2, 0x00e5ff, 0.9)
      graphics.strokeRect(
        Math.round(groundBody.x),
        Math.round(groundBody.y),
        Math.round(groundBody.width),
        Math.round(groundBody.height)
      )
    }

    graphics.lineStyle(2, 0xffd166, 0.9)
    for (const child of this.chunkManager.platformGroup.getChildren()) {
      const body = (child as Phaser.GameObjects.Rectangle)
        .body as Phaser.Physics.Arcade.StaticBody

      if (!body.enable || body.x < -5000) continue

      graphics.strokeRect(
        Math.round(body.x),
        Math.round(body.y),
        Math.round(body.width),
        Math.round(body.height)
      )
    }

    this.collisionGraphics = graphics
  }

  private clearCollisionOverlay(): void {
    if (this.collisionGraphics) {
      this.collisionGraphics.destroy()
      this.collisionGraphics = null
    }
  }

  private getDirectionFromInput(
    cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys
  ): MoveDirection {
    if (cursorKeys.left.isDown) {
      return -1
    }

    if (cursorKeys.right.isDown) {
      return 1
    }

    return 0
  }

  private updateRunState(
    cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys,
    direction: MoveDirection
  ): void {
    const leftTapPressed = Phaser.Input.Keyboard.JustDown(cursorKeys.left)
    const rightTapPressed = Phaser.Input.Keyboard.JustDown(cursorKeys.right)

    if (leftTapPressed || rightTapPressed) {
      const tappedDirection: -1 | 1 = rightTapPressed ? 1 : -1
      const tapDeltaMs = this.time.now - this.lastTapAtMs
      const isDoubleTap =
        this.lastTapDirection === tappedDirection &&
        tapDeltaMs <= this.movementConfig.runDoubleTapWindowMs

      this.lastTapDirection = tappedDirection
      this.lastTapAtMs = this.time.now

      if (isDoubleTap) {
        this.runDirection = tappedDirection
        this.player.setRunEnabled(true)
      }
    }

    const shouldDisableRun =
      direction === 0 ||
      (this.runDirection !== 0 && direction !== this.runDirection)

    if (shouldDisableRun) {
      this.runDirection = 0
      this.player.setRunEnabled(false)
    }
  }
}
