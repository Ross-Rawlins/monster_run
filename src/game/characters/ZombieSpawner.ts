import * as Phaser from 'phaser'
import type { Chunk } from '../../types/tilemaps'
import { CharacterRegistry } from '../../characters/CharacterRegistry'
import type { AbstractCharacterDefinition } from '../../characters/AbstractCharacterDefinition'
import { BaseSurfaceCharacterSpawner } from './base/BaseSurfaceCharacterSpawner'
import type {
  SurfaceSpawnContext,
  SurfaceSpawnPoint,
} from './base/BaseSurfaceCharacterSpawner'
import { ZombieCharacterActor } from './ZombieCharacterActor'
import { ZOMBIE_CHARACTER_DEFINITION } from './definitions/ZombieCharacterDefinition'

/**
 * Manages zombie NPC spawning for the infinite runner world.
 *
 * On each new chunk attachment (via spawnForChunk), it scans the chunk tile
 * grid for eligible ground-top and platform-top cells. Qualifying cells are
 * rolled against a per-cell chance and a per-chunk cap. For each confirmed
 * spawn, the surface extent is measured and a ZombieCharacterActor is created that
 * patrols within those bounds.
 *
 * Cleanup: call destroyZombiesBefore(worldX) when the chunk manager removes
 * stale chunks — this destroys any enemies whose X position has scrolled off.
 */
export class ZombieSpawner extends BaseSurfaceCharacterSpawner<ZombieCharacterActor> {
  private readonly zombieDefinitions: AbstractCharacterDefinition[]

  constructor(scene: Phaser.Scene) {
    const zombieDefinitions = CharacterRegistry.getAll().filter((d) =>
      d.id.startsWith('zombie-')
    )
    super(scene, ZOMBIE_CHARACTER_DEFINITION, zombieDefinitions)
    this.zombieDefinitions = zombieDefinitions
  }

  public override spawnForChunk(
    chunk: Chunk,
    chunkIndex: number,
    chunkOffsetX: number,
    chunkOffsetY: number,
    tileSizePx: number,
    layer: Phaser.Tilemaps.TilemapLayer
  ): void {
    if (this.zombieDefinitions.length === 0) {
      return
    }

    super.spawnForChunk(
      chunk,
      chunkIndex,
      chunkOffsetX,
      chunkOffsetY,
      tileSizePx,
      layer
    )
  }

  public override destroyBefore(worldX: number): void {
    super.destroyBefore(worldX)
  }

  public destroyZombiesBefore(worldX: number): void {
    this.destroyBefore(worldX)
  }

  protected override updateCharacter(character: ZombieCharacterActor): void {
    character.tick()
  }

  protected override createCharacterInstance(
    context: SurfaceSpawnContext
  ): ZombieCharacterActor {
    const {
      point,
      definition,
      chunkIndex,
      chunkOffsetX,
      chunkOffsetY,
      tileSizePx,
    } = context

    return this.createZombieCharacter(
      point,
      definition,
      chunkIndex,
      chunkOffsetX,
      chunkOffsetY,
      tileSizePx
    )
  }

  private createZombieCharacter(
    point: SurfaceSpawnPoint,
    definition: AbstractCharacterDefinition,
    chunkIndex: number,
    chunkOffsetX: number,
    chunkOffsetY: number,
    tileSizePx: number
  ): ZombieCharacterActor {
    const spawnX = chunkOffsetX + (point.col + 0.5) * tileSizePx
    const spawnY = chunkOffsetY + point.row * tileSizePx - 2
    const patrolMinX = chunkOffsetX + (point.patrolMinCol + 0.5) * tileSizePx
    const patrolMaxX = chunkOffsetX + (point.patrolMaxCol + 0.5) * tileSizePx

    return new ZombieCharacterActor(
      this.scene,
      spawnX,
      spawnY,
      definition,
      patrolMinX,
      patrolMaxX,
      chunkIndex
    )
  }
}
