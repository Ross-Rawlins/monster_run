import * as Phaser from 'phaser'
import { CharacterRegistry } from '../characters/CharacterRegistry'
import PlayableCharacter from '../characters/PlayableCharacter'
import { SCENE_KEYS } from '../config/keys'
import { ParallaxBackgroundManager } from '../managers/ParallaxBackgroundManager'

type MoveDirection = -1 | 0 | 1

export default class InfiniteRunnerScene extends Phaser.Scene {
  // Runner movement tuning for pixel-perfect iteration.
  private readonly movementConfig = {
    lockScreenRatio: 1 / 3,
    runDoubleTapWindowMs: 300,
    walkScrollSpeed: 210,
    runScrollSpeed: 360,
    airControlMultiplier: 0.85,
    runJumpDistanceMultiplier: 1.3,
  }

  private keys!: Phaser.Types.Input.Keyboard.CursorKeys

  private parallaxManager!: ParallaxBackgroundManager

  private player!: PlayableCharacter

  private ground!: Phaser.GameObjects.Rectangle

  private tuningHud!: Phaser.GameObjects.Text

  private previewScrollX = 0

  private lastTapDirection: MoveDirection = 0

  private lastTapAtMs = 0

  private runDirection: MoveDirection = 0

  constructor() {
    super({ key: SCENE_KEYS.INFINITE_RUNNER })
  }

  public create(): void {
    const width = this.scale.width
    const height = this.scale.height
    const gridHeight = height / 14
    const groundTop = height - gridHeight * 3

    this.cameras.main.setBackgroundColor('#52997c')
    this.parallaxManager = new ParallaxBackgroundManager(this, width, height)
    this.physics.world.setBounds(0, 0, width, height)
    this.cameras.main.setBounds(0, 0, width, height)

    this.ground = this.add
      .rectangle(
        width * 0.5,
        groundTop + (height - groundTop) * 0.5,
        width,
        height - groundTop,
        0x364859
      )
      .setDepth(10)

    this.physics.add.existing(this.ground, true)

    const knight = CharacterRegistry.getById('knight')
    this.player = new PlayableCharacter(
      this,
      width * 0.25,
      groundTop - gridHeight * 1.5,
      knight
    )
    this.player.setDepth(20)
    this.physics.add.collider(this.player, this.ground)

    this.cameras.main.scrollX = 0

    const keyboard = this.input.keyboard

    if (!keyboard) {
      throw new Error('Keyboard input is unavailable in InfiniteRunnerScene')
    }

    this.keys = keyboard.createCursorKeys()

    this.add.text(
      16,
      16,
      'Left/Right = Walk | Double-tap = Run | Up/Space = Jump | R = Restart',
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

    keyboard.on('keydown-R', () => {
      this.scene.restart()
    })

    // Cleanup on shutdown
    this.events.on('shutdown', () => {
      this.parallaxManager.destroy()
    })
  }

  public update(): void {
    const cursorKeys = this.keys
    const direction = this.getDirectionFromInput(cursorKeys)
    this.updateRunState(cursorKeys, direction)

    this.player.applyHorizontalInput(direction)

    if (
      Phaser.Input.Keyboard.JustDown(cursorKeys.up) ||
      Phaser.Input.Keyboard.JustDown(cursorKeys.space)
    ) {
      this.player.tryJump()
    }

    this.player.refreshAnimationState()

    const body = this.player.body as Phaser.Physics.Arcade.Body
    const isRunning = this.player.isRunning()
    const baseSpeed = isRunning
      ? this.movementConfig.runScrollSpeed
      : this.movementConfig.walkScrollSpeed
    const groundedMultiplier = body.blocked.down
      ? 1
      : this.movementConfig.airControlMultiplier
    const runJumpDistanceMultiplier =
      !body.blocked.down && isRunning
        ? this.movementConfig.runJumpDistanceMultiplier
        : 1

    const scrollSpeed =
      direction * baseSpeed * groundedMultiplier * runJumpDistanceMultiplier
    this.previewScrollX = Math.max(
      0,
      this.previewScrollX + scrollSpeed * this.game.loop.delta * 0.001
    )
    this.previewScrollX = Math.round(this.previewScrollX)

    const lockOffsetX = this.scale.width * this.movementConfig.lockScreenRatio
    this.player.setX(Math.round(lockOffsetX))
    body.setVelocityX(0)

    this.parallaxManager.update(this.previewScrollX)
    this.updateTuningHud(direction, isRunning, body.blocked.down, scrollSpeed)
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
      `lockScreenRatio=${config.lockScreenRatio.toFixed(4)} runDoubleTapWindowMs=${config.runDoubleTapWindowMs}`,
      `walkScrollSpeed=${config.walkScrollSpeed} runScrollSpeed=${config.runScrollSpeed}`,
      `airControlMultiplier=${config.airControlMultiplier} runJumpDistanceMultiplier=${config.runJumpDistanceMultiplier}`,
    ])
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
