import * as Phaser from 'phaser'
import type { Chunk } from '../../types/tilemaps'
import type { AbstractCharacterDefinition } from '../../characters/AbstractCharacterDefinition'
import { CharacterRegistry } from '../../characters/CharacterRegistry'
import { SKULL_CHARACTER_DEFINITION } from './definitions/SkullCharacterDefinition'
import { TILE_SIZE_PX } from '../tilemaps/TileTypes'

const START_CHUNK_INDEX = 0
const SPAWN_MARGIN_PX = 96
const CULL_MARGIN_PX = 220
const MIN_SPAWN_DELAY_MS = 900
const MAX_SPAWN_DELAY_MS = 2400
const MIN_SPEED_PX_PER_SEC = 70
const MAX_SPEED_PX_PER_SEC = 190
const MAX_ACTIVE_SKULLS = 3

export class SkullPreviewSpawner {
  private readonly scene: Phaser.Scene
  private readonly skullDefinitions: AbstractCharacterDefinition[]
  private readonly skulls: Phaser.Physics.Arcade.Sprite[] = []
  private renderScale = 1
  private started = false
  private nextSpawnAtMs = 0

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.skullDefinitions = CharacterRegistry.getAll().filter((definition) =>
      definition.id.startsWith(SKULL_CHARACTER_DEFINITION.characterIdPrefix)
    )
  }

  public spawnForChunk(
    _chunk: Chunk,
    chunkIndex: number,
    _chunkOffsetX: number,
    _chunkOffsetY: number,
    tileSizePx: number,
    _layer: Phaser.Tilemaps.TilemapLayer
  ): void {
    if (this.started || chunkIndex !== START_CHUNK_INDEX) {
      return
    }

    this.renderScale = tileSizePx / TILE_SIZE_PX
    this.started = true
    this.scheduleNextSpawn(this.scene.time.now, true)
  }

  public update(): void {
    if (!this.started) {
      return
    }

    const now = this.scene.time.now
    if (now >= this.nextSpawnAtMs && this.skulls.length < MAX_ACTIVE_SKULLS) {
      this.spawnFlyingSkull()
      this.scheduleNextSpawn(now)
    }

    const view = this.scene.cameras.main.worldView
    let index = 0
    while (index < this.skulls.length) {
      const skull = this.skulls[index]
      const outOfBounds =
        skull.x < view.x - CULL_MARGIN_PX ||
        skull.x > view.right + CULL_MARGIN_PX ||
        skull.y < view.y - CULL_MARGIN_PX ||
        skull.y > view.bottom + CULL_MARGIN_PX

      if (!skull.active || outOfBounds) {
        this.skulls.splice(index, 1)
        skull.destroy()
        continue
      }

      index += 1
    }
  }

  public destroySkullsBefore(_worldX: number): void {
    // Flying skulls are culled by camera bounds in update().
  }

  public destroy(): void {
    for (const skull of this.skulls) {
      skull.destroy()
    }
    this.skulls.length = 0
  }

  private spawnFlyingSkull(): void {
    const definition = this.skullDefinitions[0]
    if (!definition) {
      return
    }

    const cameraView = this.scene.cameras.main.worldView
    const spawnPosition = this.getRandomOffCanvasSpawn(cameraView)
    const targetPoint = this.getRandomPointOnScreen(cameraView)

    const skull = this.scene.physics.add.sprite(
      spawnPosition.x,
      spawnPosition.y,
      definition.sheetKey,
      definition.initialFrame
    )

    skull.setOrigin(0.5, 1)
    skull.setDepth(20)
    skull.setScale(this.renderScale)

    const body = skull.body as Phaser.Physics.Arcade.Body
    body.setAllowGravity(false)
    body.setImmovable(false)

    const direction = new Phaser.Math.Vector2(
      targetPoint.x - spawnPosition.x,
      targetPoint.y - spawnPosition.y
    )

    if (direction.lengthSq() < 0.0001) {
      direction.set(1, 0)
    } else {
      direction.normalize()
    }

    const speed = Phaser.Math.Between(
      MIN_SPEED_PX_PER_SEC,
      MAX_SPEED_PX_PER_SEC
    )
    body.setVelocity(direction.x * speed, direction.y * speed)

    if (direction.x < 0) {
      skull.setFlipX(true)
    }

    const idleAnimation =
      definition.animations.idle ?? definition.animations.move
    if (idleAnimation) {
      skull.play(idleAnimation.name)
    }

    this.skulls.push(skull)
  }

  private scheduleNextSpawn(nowMs: number, immediate = false): void {
    const delay = immediate
      ? 0
      : Phaser.Math.Between(MIN_SPAWN_DELAY_MS, MAX_SPAWN_DELAY_MS)
    this.nextSpawnAtMs = nowMs + delay
  }

  private getRandomOffCanvasSpawn(
    view: Phaser.Geom.Rectangle
  ): Phaser.Math.Vector2 {
    const edge = Phaser.Math.Between(0, 3)

    switch (edge) {
      case 0:
        return new Phaser.Math.Vector2(
          view.x - SPAWN_MARGIN_PX,
          Phaser.Math.Between(
            Math.floor(view.y - SPAWN_MARGIN_PX),
            Math.floor(view.bottom + SPAWN_MARGIN_PX)
          )
        )
      case 1:
        return new Phaser.Math.Vector2(
          view.right + SPAWN_MARGIN_PX,
          Phaser.Math.Between(
            Math.floor(view.y - SPAWN_MARGIN_PX),
            Math.floor(view.bottom + SPAWN_MARGIN_PX)
          )
        )
      case 2:
        return new Phaser.Math.Vector2(
          Phaser.Math.Between(
            Math.floor(view.x - SPAWN_MARGIN_PX),
            Math.floor(view.right + SPAWN_MARGIN_PX)
          ),
          view.y - SPAWN_MARGIN_PX
        )
      default:
        return new Phaser.Math.Vector2(
          Phaser.Math.Between(
            Math.floor(view.x - SPAWN_MARGIN_PX),
            Math.floor(view.right + SPAWN_MARGIN_PX)
          ),
          view.bottom + SPAWN_MARGIN_PX
        )
    }
  }

  private getRandomPointOnScreen(
    view: Phaser.Geom.Rectangle
  ): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      Phaser.Math.Between(Math.floor(view.x), Math.floor(view.right)),
      Phaser.Math.Between(Math.floor(view.y), Math.floor(view.bottom))
    )
  }
}
