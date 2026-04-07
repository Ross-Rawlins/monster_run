import * as Phaser from 'phaser'
import { CharacterRegistry } from '../characters/CharacterRegistry'
import PlayableCharacter from '../characters/PlayableCharacter'
import { SCENE_KEYS } from '../config/keys'
import { ParallaxBackgroundManager } from '../managers/ParallaxBackgroundManager'
import { TerrainManager } from '../managers/TerrainManager'

type MoveDirection = -1 | 0 | 1

interface RunnerKeys extends Phaser.Types.Input.Keyboard.CursorKeys {
  attack: Phaser.Input.Keyboard.Key
  attack3: Phaser.Input.Keyboard.Key
  debugSeed: Phaser.Input.Keyboard.Key
  debugTerrain: Phaser.Input.Keyboard.Key
  debugGrid: Phaser.Input.Keyboard.Key
  rerollTerrain: Phaser.Input.Keyboard.Key
  reset: Phaser.Input.Keyboard.Key
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

  private player!: PlayableCharacter

  private terrainManager!: TerrainManager

  private tuningHud!: Phaser.GameObjects.Text

  private previewScrollX = 0

  private lastTapDirection: MoveDirection = 0

  private lastTapAtMs = 0

  private runDirection: MoveDirection = 0

  private airborneScrollVelocity = 0

  private deterministicTerrainDebug = false

  private terrainDebugSeed = 1337

  constructor() {
    super({ key: SCENE_KEYS.INFINITE_RUNNER })
  }

  public create(): void {
    const width = this.scale.width
    const height = this.scale.height

    this.cameras.main.setBackgroundColor('#52997c')
    this.parallaxManager = new ParallaxBackgroundManager(this, width, height)
    this.terrainManager = new TerrainManager(this, width, height)
    this.physics.world.setBounds(0, 0, width, height)
    this.cameras.main.setBounds(0, 0, width, height)

    const knight = CharacterRegistry.getById('knight')
    this.player = new PlayableCharacter(
      this,
      width * 0.25,
      this.terrainManager.getSpawnSurfaceY() - 96,
      knight
    )
    this.player.setDepth(20)
    this.terrainManager.bindPlayer(this.player)
    this.terrainManager.update(0)

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
      debugSeed: Phaser.Input.Keyboard.KeyCodes.G,
      debugTerrain: Phaser.Input.Keyboard.KeyCodes.T,
      debugGrid: Phaser.Input.Keyboard.KeyCodes.V,
      rerollTerrain: Phaser.Input.Keyboard.KeyCodes.N,
      reset: Phaser.Input.Keyboard.KeyCodes.R,
    }) as RunnerKeys

    this.add.text(
      16,
      16,
      'Left/Right = Walk | Double-tap = Run | Up/Space = Jump | A/F = Attack | R = Restart | T = Terrain Debug | G = Seed Mode | N = Reroll | V = Grid View',
      {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: '#3f7a7a',
      }
    )

    this.tuningHud = this.add
      .text(16, 42, '', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#dce6ff',
        backgroundColor: '#1d2f43',
        padding: { x: 6, y: 4 },
      })
      .setDepth(100)

    // Cleanup on shutdown
    this.events.on('shutdown', () => {
      this.parallaxManager.destroy()
      this.terrainManager.destroy()
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

    if (Phaser.Input.Keyboard.JustDown(cursorKeys.debugTerrain)) {
      this.terrainManager.setDebugVisible(!this.terrainManager.isDebugVisible())
    }

    if (Phaser.Input.Keyboard.JustDown(cursorKeys.debugGrid)) {
      this.terrainManager.toggleGridDebug()
    }

    if (Phaser.Input.Keyboard.JustDown(cursorKeys.debugSeed)) {
      this.deterministicTerrainDebug = !this.deterministicTerrainDebug
      this.resetTerrainRun(
        this.deterministicTerrainDebug ? this.terrainDebugSeed : undefined
      )
    }

    if (Phaser.Input.Keyboard.JustDown(cursorKeys.rerollTerrain)) {
      if (this.deterministicTerrainDebug) {
        this.terrainDebugSeed += 1
        this.resetTerrainRun(this.terrainDebugSeed)
      } else {
        this.resetTerrainRun()
      }
    }

    this.updateForcedGroundMotionState(direction)

    this.player.applyHorizontalInput(direction)
    this.handleJumpAndAttackInput(cursorKeys)

    this.player.refreshAnimationState()

    this.updateScrollAndLock(direction)
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

    const lockOffsetX = this.scale.width * this.movementConfig.lockScreenRatio
    this.player.setX(Math.round(lockOffsetX))
    body.setVelocityX(0)

    this.parallaxManager.update(this.previewScrollX)
    this.terrainManager.update(this.previewScrollX)
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
    direction: MoveDirection,
    isRunning: boolean,
    isGrounded: boolean,
    scrollSpeed: number
  ): void {
    const config = this.movementConfig
    let activeState = 'walk'
    if (direction === 0) {
      activeState = 'idle'
    } else if (isRunning) {
      activeState = 'run'
    }

    this.tuningHud.setText([
      `state=${activeState} grounded=${isGrounded ? 'yes' : 'no'} dir=${direction}`,
      `scrollSpeed=${scrollSpeed.toFixed(1)} bgOffset=${this.previewScrollX}`,
      this.terrainManager.getDebugSummary(),
      `terrainDebug=${this.terrainManager.isDebugVisible() ? 'on' : 'off'} deterministicSeed=${this.deterministicTerrainDebug ? this.terrainDebugSeed : 'off'}`,
      `lockScreenRatio=${config.lockScreenRatio.toFixed(4)} runDoubleTapWindowMs=${config.runDoubleTapWindowMs}`,
      `walkScrollSpeed=${config.walkScrollSpeed} runScrollSpeed=${config.runScrollSpeed}`,
      `airControlMultiplier=${config.airControlMultiplier} airborneMomentumRetention=${config.airborneMomentumRetention.toFixed(3)}`,
      `airVel=${this.airborneScrollVelocity.toFixed(1)}`,
    ])
  }

  private resetTerrainRun(seed?: number): void {
    this.previewScrollX = 0
    this.airborneScrollVelocity = 0
    this.runDirection = 0
    this.player.setRunEnabled(false)
    this.player.resetToSpawn()
    this.terrainManager.reset({ seed })
    this.terrainManager.update(0)
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
