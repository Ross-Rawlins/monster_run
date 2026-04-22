import * as Phaser from 'phaser'
import type { AbstractCharacterDefinition } from '../../../characters/AbstractCharacterDefinition'
import type { Chunk } from '../../../types/tilemaps'
import { GRID_HEIGHT, GRID_WIDTH, Tile } from '../../tilemaps/TileTypes'
import type { SurfaceSpawnCharacterDefinition } from '../definitions/CharacterSpawnDefinition'

export interface SurfaceSpawnPoint {
  row: number
  col: number
  patrolMinCol: number
  patrolMaxCol: number
}

export interface SurfaceSpawnContext {
  point: SurfaceSpawnPoint
  definition: AbstractCharacterDefinition
  chunkIndex: number
  chunkOffsetX: number
  chunkOffsetY: number
  tileSizePx: number
}

type CharacterActor = Phaser.GameObjects.GameObject & {
  x: number
  destroy(fromScene?: boolean): void
}

/**
 * Shared surface-based character spawner used by zombie/skeleton variants.
 *
 * It scans chunk terrain for eligible top surfaces, applies spacing + chance
 * gates, and delegates concrete actor creation to subclasses.
 */
export abstract class BaseSurfaceCharacterSpawner<
  TCharacter extends CharacterActor,
> {
  protected readonly scene: Phaser.Scene
  protected readonly characterSpawnDefinition: SurfaceSpawnCharacterDefinition

  private readonly characterDefinitions: AbstractCharacterDefinition[]
  private readonly random: () => number
  private readonly characters: TCharacter[] = []
  private readonly colliders: Phaser.Physics.Arcade.Collider[] = []

  constructor(
    scene: Phaser.Scene,
    characterSpawnDefinition: SurfaceSpawnCharacterDefinition,
    characterDefinitions: AbstractCharacterDefinition[],
    random: () => number = Math.random
  ) {
    this.scene = scene
    this.characterSpawnDefinition = characterSpawnDefinition
    this.characterDefinitions = characterDefinitions
    this.random = random
  }

  public spawnForChunk(
    chunk: Chunk,
    chunkIndex: number,
    chunkOffsetX: number,
    chunkOffsetY: number,
    tileSizePx: number,
    layer?: Phaser.Tilemaps.TilemapLayer
  ): void {
    const spawnConfig = this.characterSpawnDefinition.spawn

    if (chunkIndex < spawnConfig.minSpawnChunkIndex) {
      return
    }

    if (this.characterDefinitions.length === 0) {
      return
    }

    const spawnPoints = this.findSpawnPoints(chunk.tiles)
    let placedThisChunk = 0

    for (const point of spawnPoints) {
      if (placedThisChunk >= spawnConfig.maxPerChunk) {
        break
      }

      if (this.random() > spawnConfig.spawnChancePerCell) {
        continue
      }

      const definition = this.pickDefinition()
      const character = this.createCharacterInstance({
        point,
        definition,
        chunkIndex,
        chunkOffsetX,
        chunkOffsetY,
        tileSizePx,
      })

      if (this.characterSpawnDefinition.physics.enableCollision && layer) {
        this.colliders.push(
          this.scene.physics.add.collider(character as never, layer)
        )
      }

      this.characters.push(character)
      placedThisChunk += 1
    }
  }

  public update(): void {
    for (const character of this.characters) {
      this.updateCharacter(character)
    }
  }

  public destroyBefore(worldX: number): void {
    let i = 0
    while (i < this.characters.length) {
      const character = this.characters[i]
      if (character.x < worldX) {
        this.characters.splice(i, 1)
        character.destroy()
      } else {
        i += 1
      }
    }
  }

  public destroy(): void {
    for (const collider of this.colliders) {
      collider.destroy()
    }
    this.colliders.length = 0

    for (const character of this.characters) {
      character.destroy()
    }
    this.characters.length = 0
  }

  protected updateCharacter(_character: TCharacter): void {
    // Default no-op; subclasses can tick behavior each frame.
  }

  protected abstract createCharacterInstance(
    context: SurfaceSpawnContext
  ): TCharacter

  private findSpawnPoints(tiles: Tile[][]): SurfaceSpawnPoint[] {
    const points: SurfaceSpawnPoint[] = []
    const occupiedCols = new Set<number>()
    const spawnConfig = this.characterSpawnDefinition.spawn

    for (let row = GRID_HEIGHT - 1; row >= 1; row -= 1) {
      for (let col = 0; col < GRID_WIDTH; col += 1) {
        if (!this.isSpawnableSurface(tiles, row, col)) {
          continue
        }

        const patrolMinCol = this.scanSurfaceExtent(tiles, row, col, -1)
        const patrolMaxCol = this.scanSurfaceExtent(tiles, row, col, 1)
        const surfaceWidth = patrolMaxCol - patrolMinCol + 1

        if (surfaceWidth < spawnConfig.minSurfaceWidthTiles) {
          continue
        }

        if (this.isTooCloseToExisting(col, occupiedCols)) {
          continue
        }

        points.push({ row, col, patrolMinCol, patrolMaxCol })
        occupiedCols.add(col)
      }
    }

    return points
  }

  private isSpawnableSurface(
    tiles: Tile[][],
    row: number,
    col: number
  ): boolean {
    const cell = tiles[row][col]
    if (tiles[row - 1][col] !== Tile.EMPTY) {
      return false
    }

    const surfaces = this.characterSpawnDefinition.spawn.surfaces
    const allowGround = surfaces.includes('ground_top')
    const allowPlatform = surfaces.includes('platform_top')

    return (
      (allowGround && cell === Tile.GROUND) ||
      (allowPlatform && cell === Tile.PLATFORM)
    )
  }

  private scanSurfaceExtent(
    tiles: Tile[][],
    row: number,
    startCol: number,
    direction: -1 | 1
  ): number {
    const surfaceTile = tiles[row][startCol]
    let col = startCol

    while (true) {
      const next = col + direction
      if (next < 0 || next >= GRID_WIDTH) {
        break
      }

      if (tiles[row][next] !== surfaceTile) {
        break
      }

      if (tiles[row - 1][next] !== Tile.EMPTY) {
        break
      }

      col = next
    }

    return col
  }

  private isTooCloseToExisting(col: number, occupied: Set<number>): boolean {
    const minSpacing =
      this.characterSpawnDefinition.spawn.minHorizontalSpacingTiles

    for (const existingCol of occupied) {
      if (Math.abs(col - existingCol) < minSpacing) {
        return true
      }
    }

    return false
  }

  private pickDefinition(): AbstractCharacterDefinition {
    const index = Math.floor(this.random() * this.characterDefinitions.length)
    return this.characterDefinitions[index]
  }
}
