import * as Phaser from 'phaser'
import { CharacterRegistry } from '../characters/CharacterRegistry'
import PlayableCharacter from '../characters/PlayableCharacter'
import { SCENE_KEYS } from '../config/keys'
import { AbstractCharacterDefinition } from '../characters/AbstractCharacterDefinition'
import { BodyDebugPanel } from '../debug/BodyDebugPanel'

interface SandboxKeys extends Phaser.Types.Input.Keyboard.CursorKeys {
  attack: Phaser.Input.Keyboard.Key
  attack3: Phaser.Input.Keyboard.Key
  reset: Phaser.Input.Keyboard.Key
  spawnSlower: Phaser.Input.Keyboard.Key
  spawnFaster: Phaser.Input.Keyboard.Key
  maxEnemiesDown: Phaser.Input.Keyboard.Key
  maxEnemiesUp: Phaser.Input.Keyboard.Key
  bodyDebug: Phaser.Input.Keyboard.Key
}

interface CharacterDisplay {
  id: number
  character: PlayableCharacter
  hp: number
  hpLabel: Phaser.GameObjects.Text
  isEnemy: boolean
  nextAttackAt?: number
}

export default class CharacterSandboxScene extends Phaser.Scene {
  private player?: CharacterDisplay

  private enemies: CharacterDisplay[] = []

  private floor!: Phaser.GameObjects.Rectangle

  private enemyDefinitions: AbstractCharacterDefinition[] = []

  private spawnTimer?: Phaser.Time.TimerEvent

  private readonly attackHitCooldownMs = 220

  private readonly startingEnemyHp = 3

  private readonly startingKnightHp = 10

  private maxEnemies = 1

  private readonly minEnemies = 1

  private spawnDelayMs = 2400

  private nextCombatId = 1

  private readonly recentHitAtByPair = new Map<string, number>()

  private statusLabel!: Phaser.GameObjects.Text

  private keys!: SandboxKeys

  private bodyDebugPanel?: BodyDebugPanel

  private lastTapDirection: -1 | 0 | 1 = 0

  private lastTapAtMs = 0

  private runDirection: -1 | 0 | 1 = 0

  private readonly runDoubleTapWindowMs = 300

  constructor() {
    super({ key: SCENE_KEYS.CHARACTER_SANDBOX })
  }

  public create(): void {
    const width = this.scale.width
    const height = this.scale.height

    this.enemyDefinitions = CharacterRegistry.getAll().filter(
      (definition) =>
        definition.id.startsWith('skeleton-') ||
        definition.id.startsWith('zombie-')
    )

    this.physics.world.setBounds(0, 0, width, height)

    this.add
      .rectangle(width * 0.5, height * 0.5, width, height, 0x171a25)
      .setDepth(-2)
    this.add
      .rectangle(width * 0.5, height * 0.72, width, height * 0.32, 0x20263a)
      .setDepth(-1)

    this.keys = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      attack: Phaser.Input.Keyboard.KeyCodes.A,
      attack3: Phaser.Input.Keyboard.KeyCodes.F,
      reset: Phaser.Input.Keyboard.KeyCodes.R,
      spawnSlower: Phaser.Input.Keyboard.KeyCodes.Q,
      spawnFaster: Phaser.Input.Keyboard.KeyCodes.E,
      maxEnemiesDown: Phaser.Input.Keyboard.KeyCodes.Z,
      maxEnemiesUp: Phaser.Input.Keyboard.KeyCodes.X,
      bodyDebug: Phaser.Input.Keyboard.KeyCodes.B,
    }) as SandboxKeys

    this.floor = this.add.rectangle(
      width * 0.5,
      height - 80,
      width,
      34,
      0x3b455f
    )
    this.physics.add.existing(this.floor, true)

    this.add.text(
      16,
      16,
      [
        'Left/Right = move  |  Space/Up = jump',
        'Double-tap Left/Right = run',
        'A = attack (run=attack2, air=attack3)   F = attack3',
        'R = restart encounter',
        'One enemy at a time; next enemy spawns after kill',
        'Enemies spawn to the right of the knight',
        'Q/E = slower/faster next enemy delay  |  B = body debug',
      ].join('\n'),
      {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#f5f7ff',
        lineSpacing: 6,
      }
    )

    this.statusLabel = this.add.text(16, 104, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#ffde8a',
    })

    this.spawnPlayerKnight()

    this.bodyDebugPanel = new BodyDebugPanel((state, body) => {
      this.player?.character.setDebugBodyOverride(state, body)
    })

    for (let i = 0; i < this.minEnemies; i += 1) {
      this.spawnEnemy()
    }

    this.restartSpawnTimer()

    this.updateStatusHud()
  }

  public update(): void {
    if (!this.player) {
      return
    }

    let direction = 0
    if (this.keys.left.isDown) {
      direction = -1
    } else if (this.keys.right.isDown) {
      direction = 1
    }

    const bodyDebugPressed = Phaser.Input.Keyboard.JustDown(this.keys.bodyDebug)
    if (bodyDebugPressed) {
      this.bodyDebugPanel?.toggle()
    }

    // Update the debug panel display every frame
    if (this.bodyDebugPanel?.isVisible()) {
      const player = this.player.character
      this.bodyDebugPanel.update(
        player.getCurrentState(),
        player.getCurrentBodyValues()
      )
    }

    // Suppress game keyboard when the debug panel's inputs have focus
    if (this.bodyDebugPanel?.hasFocus()) {
      return
    }

    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.keys.up) ||
      Phaser.Input.Keyboard.JustDown(
        this.keys.space as unknown as Phaser.Input.Keyboard.Key
      )
    const attackPressed = Phaser.Input.Keyboard.JustDown(this.keys.attack)
    const attack3Pressed = Phaser.Input.Keyboard.JustDown(this.keys.attack3)
    const resetPressed = Phaser.Input.Keyboard.JustDown(this.keys.reset)
    const spawnSlowerPressed = Phaser.Input.Keyboard.JustDown(
      this.keys.spawnSlower
    )
    const spawnFasterPressed = Phaser.Input.Keyboard.JustDown(
      this.keys.spawnFaster
    )
    const maxEnemiesDownPressed = Phaser.Input.Keyboard.JustDown(
      this.keys.maxEnemiesDown
    )
    const maxEnemiesUpPressed = Phaser.Input.Keyboard.JustDown(
      this.keys.maxEnemiesUp
    )
    const leftTapPressed = Phaser.Input.Keyboard.JustDown(this.keys.left)
    const rightTapPressed = Phaser.Input.Keyboard.JustDown(this.keys.right)

    if (resetPressed) {
      this.scene.restart()
      return
    }

    if (spawnSlowerPressed) {
      this.spawnDelayMs = Math.min(5000, this.spawnDelayMs + 200)
      this.restartSpawnTimer()
    }
    if (spawnFasterPressed) {
      this.spawnDelayMs = Math.max(400, this.spawnDelayMs - 200)
      this.restartSpawnTimer()
    }
    if (maxEnemiesDownPressed || maxEnemiesUpPressed) {
      this.maxEnemies = 1
    }

    const player = this.player.character
    if (leftTapPressed || rightTapPressed) {
      const tappedDirection: -1 | 1 = rightTapPressed ? 1 : -1
      const tapDeltaMs = this.time.now - this.lastTapAtMs
      const isDoubleTap =
        this.lastTapDirection === tappedDirection &&
        tapDeltaMs <= this.runDoubleTapWindowMs

      this.lastTapDirection = tappedDirection
      this.lastTapAtMs = this.time.now

      if (isDoubleTap) {
        this.runDirection = tappedDirection
        player.setRunEnabled(true)
      }
    }

    const currentDirection = direction as -1 | 0 | 1
    if (currentDirection === 0) {
      this.runDirection = 0
      player.setRunEnabled(false)
    } else if (
      this.runDirection !== 0 &&
      currentDirection !== this.runDirection
    ) {
      this.runDirection = 0
      player.setRunEnabled(false)
    }

    player.applyHorizontalInput(direction)
    if (jumpPressed) player.tryJump()
    if (attackPressed) {
      const attackState = !player.isGrounded()
        ? 'attack3'
        : player.isRunning()
          ? 'attack2'
          : 'attack'
      player.triggerAction(attackState)
    }
    if (attack3Pressed) player.triggerAction('attack3')

    this.updateEnemyAI()

    player.refreshAnimationState()
    this.enemies.forEach((enemy) => enemy.character.refreshAnimationState())

    this.updateStatusHud()
  }

  private updateEnemyAI(): void {
    if (!this.player || this.player.character.isDeadState()) {
      return
    }

    const player = this.player.character

    this.enemies.forEach((enemy) => {
      const enemyCharacter = enemy.character
      if (!enemyCharacter.active || enemyCharacter.isDeadState()) {
        return
      }

      const deltaX = player.x - enemyCharacter.x
      const absDeltaX = Math.abs(deltaX)
      const attackDistance = 30

      if (absDeltaX > attackDistance) {
        enemyCharacter.applyHorizontalInput(deltaX > 0 ? 1 : -1)
      } else {
        enemyCharacter.applyHorizontalInput(0)

        if (this.time.now >= (enemy.nextAttackAt ?? 0)) {
          const action = this.pickRandomAttackAction(enemyCharacter)
          if (action) {
            enemyCharacter.triggerAction(action)
          }
          enemy.nextAttackAt = this.time.now + Phaser.Math.Between(850, 1500)
        }
      }
    })
  }

  private pickRandomAttackAction(
    character: PlayableCharacter
  ): 'attack' | 'attack2' | 'attack3' | undefined {
    const animations = character.getDefinition().animations
    const available = (['attack', 'attack2', 'attack3'] as const).filter(
      (key) => animations[key] != null
    )

    if (available.length === 0) {
      return undefined
    }

    return Phaser.Utils.Array.GetRandom(available)
  }

  private spawnPlayerKnight(): void {
    const definition = CharacterRegistry.getById('knight')
    const x = this.scale.width * 0.3
    const y = this.floor.y - this.floor.height * 0.5
    this.player = this.createDisplay(definition, x, y, false)
  }

  private spawnEnemy(): void {
    if (
      this.enemyDefinitions.length === 0 ||
      this.enemies.length >= this.maxEnemies
    ) {
      return
    }

    const definition = Phaser.Utils.Array.GetRandom(this.enemyDefinitions)
    const y = this.floor.y - this.floor.height * 0.5
    const knightX = this.player?.character.x ?? this.scale.width * 0.3
    const minX = Math.max(
      Math.floor(knightX + 70),
      Math.floor(this.scale.width * 0.6)
    )
    const maxX = this.scale.width - 70
    const x = minX < maxX ? Phaser.Math.Between(minX, maxX) : maxX

    const enemy = this.createDisplay(definition, x, y, true)
    enemy.nextAttackAt = this.time.now + Phaser.Math.Between(500, 1300)
    this.enemies.push(enemy)
  }

  private createDisplay(
    definition: AbstractCharacterDefinition,
    x: number,
    y: number,
    isEnemy: boolean
  ): CharacterDisplay {
    const character = new PlayableCharacter(this, x, y, definition)
    const id = this.nextCombatId++
    character.setData('combat-id', id)
    this.setupCharacterCollisions(character)

    if (this.player) {
      this.setupCharacterHitOverlap(character, this.player.character)
    }
    this.enemies.forEach((enemy) => {
      this.setupCharacterHitOverlap(character, enemy.character)
    })

    const hp = isEnemy ? this.startingEnemyHp : this.startingKnightHp
    const hpLabel = this.add.text(x, y - 40, `HP: ${hp}`, {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#a6f7b0',
    })
    hpLabel.setOrigin(0.5, 1)
    hpLabel.setDepth(10)

    return {
      id,
      character,
      hp,
      hpLabel,
      isEnemy,
    }
  }

  private setupCharacterHitOverlap(
    first: PlayableCharacter,
    second: PlayableCharacter
  ): void {
    this.physics.add.overlap(first, second, () => {
      this.tryApplyAttackHit(first, second)
      this.tryApplyAttackHit(second, first)
    })
  }

  private tryApplyAttackHit(
    attacker: PlayableCharacter,
    target: PlayableCharacter
  ): void {
    if (!attacker.active || !target.active) {
      return
    }

    if (
      !attacker.isAttackActive() ||
      attacker.isDeadState() ||
      target.isDeadState()
    ) {
      return
    }

    // Enemies cannot damage other enemies — only the knight deals damage to enemies.
    const attackerDisplay = this.getDisplayForCharacter(attacker)
    const targetDisplay = this.getDisplayForCharacter(target)
    if (attackerDisplay?.isEnemy && targetDisplay?.isEnemy) {
      return
    }

    const deltaX = target.x - attacker.x
    const deltaY = target.y - attacker.y

    // Keep hits local to nearby characters and same lane/row.
    if (Math.abs(deltaX) > 74 || Math.abs(deltaY) > 34) {
      return
    }

    // Only hit characters in front of the attacker.
    // A 16px tolerance lets attacks land when enemies are directly on top.
    const facingDirection = attacker.getFacingDirection()
    if (
      (facingDirection > 0 && deltaX < -16) ||
      (facingDirection < 0 && deltaX > 16)
    ) {
      return
    }

    const attackerId = Number(attacker.getData('combat-id'))
    const targetId = Number(target.getData('combat-id'))
    const key = `${attackerId}->${targetId}`
    const now = this.time.now
    const lastHit = this.recentHitAtByPair.get(key) ?? -Infinity

    if (now - lastHit < this.attackHitCooldownMs) {
      return
    }

    this.recentHitAtByPair.set(key, now)

    if (!targetDisplay || targetDisplay.hp <= 0) {
      return
    }

    targetDisplay.hp = Math.max(0, targetDisplay.hp - 1)
    this.updateHpLabel(targetDisplay)

    if (targetDisplay.hp <= 0) {
      this.handleDefeat(targetDisplay)
    } else {
      target.triggerAction('hurt')
    }

    this.flashHit(target)
    this.spawnDamageNumber(target, 1)
  }

  private flashHit(target: PlayableCharacter): void {
    target.setTintFill(0xff5555)
    this.time.delayedCall(70, () => {
      if (target.active) {
        target.clearTint()
      }
    })
  }

  private spawnDamageNumber(target: PlayableCharacter, amount: number): void {
    const damageText = this.add.text(target.x, target.y - 70, `-${amount}`, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#ff7d7d',
      stroke: '#120000',
      strokeThickness: 2,
    })
    damageText.setOrigin(0.5, 1)
    damageText.setDepth(20)

    this.tweens.add({
      targets: damageText,
      y: damageText.y - 22,
      alpha: 0,
      duration: 260,
      ease: 'Quad.easeOut',
      onComplete: () => damageText.destroy(),
    })
  }

  private handleDefeat(display: CharacterDisplay): void {
    const deathAnimation = display.character.getDefinition().animations.death

    if (!deathAnimation) {
      if (display.isEnemy) {
        this.removeEnemy(display)
        this.restartSpawnTimer()
      }
      return
    }

    if (display.isEnemy) {
      display.character.once(
        Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + deathAnimation.name,
        () => {
          this.removeEnemy(display)
          this.restartSpawnTimer()
        }
      )
    }

    display.character.triggerAction('death')
  }

  private removeEnemy(display: CharacterDisplay): void {
    this.enemies = this.enemies.filter((entry) => entry.id !== display.id)
    this.recentHitAtByPair.forEach((_, key) => {
      if (
        key.startsWith(`${display.id}->`) ||
        key.endsWith(`->${display.id}`)
      ) {
        this.recentHitAtByPair.delete(key)
      }
    })

    display.character.destroy()
    display.hpLabel.destroy()
  }

  private getDisplayForCharacter(
    character: PlayableCharacter
  ): CharacterDisplay | undefined {
    const id = Number(character.getData('combat-id'))
    if (!Number.isFinite(id)) return undefined

    if (this.player && this.player.id === id) {
      return this.player
    }

    return this.enemies.find((entry) => entry.id === id)
  }

  private updateHpLabel(display: CharacterDisplay): void {
    display.hpLabel.setText(`HP: ${display.hp}`)
    display.hpLabel.setColor(display.hp > 1 ? '#a6f7b0' : '#ffb0b0')
  }

  private updateStatusHud(): void {
    const knightHp = this.player?.hp ?? 0
    this.statusLabel.setText(
      `Knight HP: ${knightHp}  |  Enemies: ${this.enemies.length}/${this.maxEnemies}  |  Spawn: ${(this.spawnDelayMs / 1000).toFixed(1)}s`
    )
  }

  private restartSpawnTimer(): void {
    this.spawnTimer?.remove(false)
    this.spawnTimer = this.time.addEvent({
      delay: this.spawnDelayMs,
      loop: false,
      callback: () => {
        if (
          this.enemies.length === 0 &&
          this.player &&
          !this.player.character.isDeadState()
        ) {
          this.spawnEnemy()
        }
      },
    })
  }

  private setupCharacterCollisions(character: PlayableCharacter): void {
    this.physics.add.collider(character, this.floor)
  }

  public shutdown(): void {
    this.spawnTimer?.remove(false)
    this.bodyDebugPanel?.destroy()
    this.bodyDebugPanel = undefined
  }
}
