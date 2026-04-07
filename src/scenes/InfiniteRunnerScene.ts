import * as Phaser from 'phaser'
import { CharacterRegistry } from '../characters/CharacterRegistry'
import PlayableCharacter from '../characters/PlayableCharacter'
import { SCENE_KEYS } from '../config/keys'
import { ParallaxBackgroundManager } from '../managers/ParallaxBackgroundManager'

export default class InfiniteRunnerScene extends Phaser.Scene {
  private readonly worldWidthMultiplier = 8

  private readonly lockScreenRatio = 1 / 3

  private keys!: Phaser.Types.Input.Keyboard.CursorKeys

  private parallaxManager!: ParallaxBackgroundManager

  private player!: PlayableCharacter

  private ground!: Phaser.GameObjects.Rectangle

  private previewScrollX = 0

  constructor() {
    super({ key: SCENE_KEYS.INFINITE_RUNNER })
  }

  public create(): void {
    const width = this.scale.width
    const height = this.scale.height
    const worldWidth = width * this.worldWidthMultiplier
    const gridHeight = height / 14
    const groundTop = height - gridHeight * 3

    this.cameras.main.setBackgroundColor('#52997c')
    this.parallaxManager = new ParallaxBackgroundManager(this, width, height)
    this.physics.world.setBounds(0, 0, worldWidth, height)
    this.cameras.main.setBounds(0, 0, worldWidth, height)

    this.ground = this.add
      .rectangle(
        worldWidth * 0.5,
        groundTop + (height - groundTop) * 0.5,
        worldWidth,
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
      'Left/Right = Move Knight | Up/Space = Jump | R = Restart',
      {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: '#3f7a7a',
      }
    )

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
    let direction = 0

    if (cursorKeys.left.isDown) {
      direction = -1
    } else if (cursorKeys.right.isDown) {
      direction = 1
    }

    this.player.applyHorizontalInput(direction)

    if (
      Phaser.Input.Keyboard.JustDown(cursorKeys.up) ||
      Phaser.Input.Keyboard.JustDown(cursorKeys.space)
    ) {
      this.player.tryJump()
    }

    this.player.refreshAnimationState()

    const camera = this.cameras.main
    const lockOffsetX = this.scale.width * this.lockScreenRatio
    const maxScrollX = Math.max(0, this.physics.world.bounds.width - camera.width)
    camera.scrollX = Phaser.Math.Clamp(this.player.x - lockOffsetX, 0, maxScrollX)

    this.previewScrollX = camera.scrollX

    this.parallaxManager.update(this.previewScrollX)
  }
}
