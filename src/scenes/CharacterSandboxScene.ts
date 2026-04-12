import * as Phaser from 'phaser'
import { CharacterRegistry } from '../characters/CharacterRegistry'
import PlayableCharacter from '../characters/PlayableCharacter'
import { SCENE_KEYS } from '../config/keys'

export default class CharacterSandboxScene extends Phaser.Scene {
  private player!: PlayableCharacter
  private enemy!: PlayableCharacter
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private attackKey!: Phaser.Input.Keyboard.Key
  private resetKey!: Phaser.Input.Keyboard.Key

  constructor() {
    super({ key: SCENE_KEYS.CHARACTER_SANDBOX })
  }

  public create(): void {
    const width = this.scale.width
    const height = this.scale.height

    this.physics.world.setBounds(0, 0, width, height)

    this.add.rectangle(width * 0.5, height * 0.5, width, height, 0x171a25)
    this.add
      .rectangle(width * 0.5, height * 0.75, width, height * 0.3, 0x20263a)
      .setDepth(-1)

    const floor = this.add.rectangle(
      width * 0.5,
      height - 90,
      width,
      36,
      0x3b455f
    )
    this.physics.add.existing(floor, true)

    const knight = CharacterRegistry.getById('skeleton-warrior-default')
    const zombie = CharacterRegistry.getById('zombie-default')

    this.player = new PlayableCharacter(
      this,
      width * 0.35,
      floor.y - 18,
      knight
    )
    this.enemy = new PlayableCharacter(this, width * 0.65, floor.y - 18, zombie)

    this.player.setDepth(10)
    this.enemy.setDepth(10)

    this.physics.add.collider(this.player, floor)
    this.physics.add.collider(this.enemy, floor)

    const keyboard = this.input.keyboard
    if (!keyboard) {
      throw new Error('Keyboard input is unavailable in CharacterSandboxScene')
    }

    this.cursors = keyboard.createCursorKeys()
    this.attackKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this.resetKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R)

    this.add.text(
      16,
      16,
      'Character Sandbox (scene=sandbox)\nLeft/Right move, Up/Space jump, A attack, R restart\nUse scene=runner for infinite runner.',
      { fontFamily: 'monospace', fontSize: '13px', color: '#f5f7ff' }
    )
  }

  public update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.resetKey)) {
      this.scene.restart()
      return
    }

    let direction = 0
    if (this.cursors.left.isDown) {
      direction = -1
    } else if (this.cursors.right.isDown) {
      direction = 1
    }

    this.player.applyHorizontalInput(direction)

    if (
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.space)
    ) {
      this.player.tryJump()
    }

    if (Phaser.Input.Keyboard.JustDown(this.attackKey)) {
      this.player.triggerAction('attack')
    }

    // Keep the enemy visible and facing the player for animation checks.
    this.enemy.applyHorizontalInput(0)
    this.enemy.setFlipX(this.player.x < this.enemy.x)

    this.player.refreshAnimationState()
    this.enemy.refreshAnimationState()
  }
}
