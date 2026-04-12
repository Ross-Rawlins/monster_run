import type { Chunk } from '../../types/tilemaps'
import { GRID_HEIGHT, GRID_WIDTH, Tile } from './TileTypes'
import { GroundGenerator } from './ground/GroundGenerator'
import { PlatformGenerator } from './platforms/PlatformGenerator'
import { SupportGenerator } from './supports/SupportGenerator'

interface GeneratorOptions {
  seed?: number
  width?: number
  height?: number
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0

  return () => {
    state += 0x6d2b79f5
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export class WFCGenerator {
  private readonly width: number
  private readonly height: number
  private readonly random: () => number
  private seededLeftColumn: Tile[] | null = null

  constructor(options: GeneratorOptions = {}) {
    this.width = options.width ?? GRID_WIDTH
    this.height = options.height ?? GRID_HEIGHT
    this.random = mulberry32(options.seed ?? Date.now())
  }

  public seedLeftColumn(previousRightColumn: Tile[]): void {
    if (previousRightColumn.length !== this.height) {
      throw new Error(
        `Expected previous right column to contain ${this.height} tiles, received ${previousRightColumn.length}`
      )
    }

    this.seededLeftColumn = previousRightColumn
  }

  public generate(): Chunk {
    const tiles: Tile[][] = Array.from({ length: this.height }, () =>
      Array.from({ length: this.width }, () => Tile.EMPTY)
    )

    this.generateGround(tiles)
    this.generatePlatforms(tiles)
    this.generateSupports(tiles)
    this.applySeededLeftColumn(tiles)

    return {
      tiles,
      rightColumn: tiles.map((row) => row[this.width - 1]),
    }
  }

  private generateGround(tiles: Tile[][]): void {
    const groundGenerator = new GroundGenerator({
      width: this.width,
      height: this.height,
      random: this.random,
    })

    groundGenerator.placeGround(tiles, this.seededLeftColumn)
  }

  private generatePlatforms(tiles: Tile[][]): void {
    const platformGenerator = new PlatformGenerator({
      width: this.width,
      random: this.random,
    })

    platformGenerator.placePlatforms(tiles)
  }

  private generateSupports(tiles: Tile[][]): void {
    const supportGenerator = new SupportGenerator({
      width: this.width,
      height: this.height,
      random: this.random,
    })

    supportGenerator.placeSupports(tiles)
  }

  private applySeededLeftColumn(tiles: Tile[][]): void {
    if (!this.seededLeftColumn) {
      return
    }

    for (let row = 0; row < this.height; row += 1) {
      tiles[row][0] = this.seededLeftColumn[row]
    }
  }
}
