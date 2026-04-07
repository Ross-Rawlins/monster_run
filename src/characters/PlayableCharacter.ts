import * as Phaser from 'phaser'
import { CharacterState } from './types'
import { AbstractCharacterDefinition } from './AbstractCharacterDefinition'

export default class PlayableCharacter extends Phaser.Physics.Arcade.Sprite {
  private definition: AbstractCharacterDefinition

  private readonly spawnPoint: Phaser.Math.Vector2

  private currentState: CharacterState = 'idle'

  private isPerformingAction = false

  private isDead = false

  private currentActionState?:
    | 'attack'
    | 'attack2'
    | 'attack3'
    | 'defend'
    | 'hurt'
    | 'death'
    | 'stunned'
    | 'rise'

  private runEnabled = false

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    definition: AbstractCharacterDefinition
  ) {
    super(scene, x, y, definition.sheetKey, definition.initialFrame)

    this.definition = definition
    this.spawnPoint = new Phaser.Math.Vector2(x, y)

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setScale(definition.scale)
    this.setOrigin(0.5, 1)
    this.setCollideWorldBounds(true)
    this.setDragX(definition.drag ?? 1600)
    this.playAnimationState('idle')

    const body = this.body as Phaser.Physics.Arcade.Body

    body.setSize(definition.body.width, definition.body.height)
    body.setOffset(definition.body.offsetX, definition.body.offsetY)

    this.on(
      Phaser.Animations.Events.ANIMATION_COMPLETE,
      this.handleAnimationComplete,
      this
    )
  }

  public applyHorizontalInput(direction: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body

    if (this.isDead) {
      body.setVelocityX(0)
      return
    }

    const runningAttackActive =
      this.isPerformingAction &&
      this.currentActionState === 'attack2' &&
      this.runEnabled
    if (this.isPerformingAction && !runningAttackActive) {
      body.setVelocityX(0)
      return
    }

    const runSpeedMultiplier = this.runEnabled ? 1.45 : 1
    body.setVelocityX(
      direction * this.definition.moveSpeed * runSpeedMultiplier
    )

    const facingRight = this.definition.facingRight ?? false
    if (direction < 0) {
      this.setFlipX(facingRight)
    } else if (direction > 0) {
      this.setFlipX(!facingRight)
    }
  }

  public tryJump(): void {
    const body = this.body as Phaser.Physics.Arcade.Body

    if (this.isDead || !body.blocked.down) {
      return
    }

    if (this.definition.canJump === false) {
      return
    }

    body.setVelocityY(-this.definition.jumpVelocity)
  }

  public triggerAction(
    state:
      | 'attack'
      | 'attack2'
      | 'attack3'
      | 'defend'
      | 'hurt'
      | 'death'
      | 'stunned'
      | 'rise'
  ): void {
    if (this.isDead && state !== 'death') {
      return
    }

    if (this.isPerformingAction && state !== 'death') {
      return
    }

    const actionAnimation = this.definition.animations[state]

    if (!actionAnimation) {
      return
    }

    if (state === 'death') {
      this.isDead = true
      this.currentActionState = undefined
      this.isPerformingAction = false
    }

    this.currentActionState = state
    this.isPerformingAction = true
    this.playAnimationState(state, true)
  }

  public resetToSpawn(): void {
    const body = this.body as Phaser.Physics.Arcade.Body

    this.isPerformingAction = false
    this.isDead = false
    this.currentActionState = undefined
    this.currentState = 'idle'
    this.setPosition(this.spawnPoint.x, this.spawnPoint.y)
    this.setFlipX(false)
    body.stop()
    this.setDragX(this.definition.drag ?? 1600)
    this.playAnimationState('idle', true)
  }

  public refreshAnimationState(): void {
    if (this.isPerformingAction || this.isDead) {
      return
    }

    const body = this.body as Phaser.Physics.Arcade.Body
    const canJump = this.definition.canJump !== false
    const speedX = Math.abs(body.velocity.x)

    // Manage drag: less drag when airborne to preserve jump arc momentum
    if (!body.blocked.down && canJump) {
      body.setDragX(this.definition.airDrag ?? 80)
    } else {
      body.setDragX(this.definition.drag ?? 1600)
    }

    let nextState: CharacterState = 'idle'

    if (!body.blocked.down) {
      // Non-jumpers show walk cycle when falling
      nextState = canJump ? 'jump' : 'move'
    } else if (
      this.runEnabled &&
      speedX > 5 &&
      this.definition.animations.run != null
    ) {
      nextState = 'run'
    } else if (speedX > 5) {
      nextState = 'move'
    }

    this.playAnimationState(nextState)
  }

  public getDefinition(): AbstractCharacterDefinition {
    return this.definition
  }

  public isFacingRightWorld(): boolean {
    const facingRightByDefault = this.definition.facingRight ?? false
    return this.flipX !== facingRightByDefault
  }

  public getFacingDirection(): -1 | 1 {
    return this.isFacingRightWorld() ? 1 : -1
  }

  public isDeadState(): boolean {
    return this.isDead
  }

  public isAttackActive(): boolean {
    return (
      this.isPerformingAction &&
      (this.currentActionState === 'attack' ||
        this.currentActionState === 'attack2' ||
        this.currentActionState === 'attack3')
    )
  }

  public isGrounded(): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body
    return body.blocked.down
  }

  public setRunEnabled(enabled: boolean): void {
    this.runEnabled = enabled
  }

  public isRunning(): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body
    return this.runEnabled && body.blocked.down && Math.abs(body.velocity.x) > 5
  }

  private playAnimationState(state: CharacterState, force = false): void {
    if (!force && this.currentState === state) {
      return
    }

    const animation = this.definition.animations[state]

    if (!animation) {
      return
    }

    this.currentState = state
    this.anims.play(animation.name, true)
  }

  private handleAnimationComplete(
    animation: Phaser.Animations.Animation
  ): void {
    // Death is terminal — stay in death state permanently
    if (this.definition.animations.death?.name === animation.key) {
      return
    }

    const anims = this.definition.animations
    const actionKeys = [
      'attack',
      'attack2',
      'attack3',
      'defend',
      'hurt',
      'stunned',
      'rise',
    ] as const
    const completedAction = actionKeys.some(
      (key) => anims[key]?.name === animation.key
    )

    if (!completedAction) {
      return
    }

    this.currentActionState = undefined
    this.isPerformingAction = false
    this.refreshAnimationState()
  }
}
