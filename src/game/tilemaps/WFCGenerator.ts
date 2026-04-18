import type { Chunk, LayerBoundaryColumns } from '../../types/tilemaps'
import {
  GRID_HEIGHT,
  GRID_WIDTH,
  Tile,
  TILE_RENDER_INDEX,
  getRenderFrameForTileAt,
} from './TileTypes'
import { GroundGenerator } from './layers/ground/GroundGenerator'
import { PlatformGenerator } from './layers/platforms/PlatformGenerator'
import { CaveGenerator } from './layers/caves/CaveGenerator'
import { LayerCompositor } from './compositor/LayerCompositor'

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
  private seededLayerLeftColumns: Partial<LayerBoundaryColumns> | null = null
  private previousGroundOpenSectionStyleIndex: number | null = null

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

  public seedLayerLeftColumns(columns: LayerBoundaryColumns): void {
    this.validateLayerColumnLength(columns.ground, 'ground')
    this.validateLayerColumnLength(columns.platforms, 'platforms')
    this.validateLayerColumnLength(columns.caves, 'caves')
    this.seededLayerLeftColumns = columns
  }

  public seedGroundOpenSectionStyleIndex(styleIndex: number | null): void {
    this.previousGroundOpenSectionStyleIndex = styleIndex
  }

  public generate(): Chunk {
    const options = {
      width: this.width,
      height: this.height,
      random: this.random,
    }

    const groundGenerator = new GroundGenerator(options)
    groundGenerator.seedCarryInOpenSectionStyleIndex(
      this.previousGroundOpenSectionStyleIndex
    )

    const compositor = new LayerCompositor({
      width: this.width,
      height: this.height,
      seededLeftColumn: this.seededLeftColumn,
      seededLayerColumns: this.seededLayerLeftColumns,
    })

    const result = compositor.compose([
      { name: 'ground', generator: groundGenerator },
      { name: 'platforms', generator: new PlatformGenerator(options) },
      { name: 'caves', generator: new CaveGenerator(options) },
    ])

    const groundLayer = result.layers.get('ground')!
    const platformLayer = result.layers.get('platforms')!
    const caveLayer = result.layers.get('caves')!

    // Merge ground and platform into a single terrain grid for the existing Chunk interface.
    const tiles = this.mergeLayers([groundLayer, platformLayer])

    // Restore seeded left column onto the merged terrain for cross-chunk continuity.
    if (this.seededLeftColumn) {
      for (let row = 0; row < this.height; row += 1) {
        tiles[row][0] = this.seededLeftColumn[row]
      }
    }

    const groundTopStyleByColumn = groundGenerator.getTopStyleByColumn()
    const collisionTilemapData = tiles.map((row, rowIndex) =>
      row.map((_, colIndex) =>
        getRenderFrameForTileAt(tiles, rowIndex, colIndex, {
          groundStyleByColumn: groundTopStyleByColumn,
        })
      )
    )

    const supportBackdropTiles = this.buildSupportBackdropTiles(
      tiles,
      caveLayer
    )

    return {
      tiles,
      supportTiles: caveLayer,
      collisionTilemapData,
      supportVisualTilemapData:
        this.buildSupportVisualTilemapData(supportBackdropTiles),
      supportForegroundTilemapData: this.buildSupportForegroundTilemapData(
        tiles,
        caveLayer
      ),
      rightColumn: tiles.map((row) => row[this.width - 1]),
      groundTopStyleByColumn,
      rightGroundOpenSectionStyleIndex:
        groundGenerator.getRightOpenSectionStyleIndex(),
      layerRightColumns: {
        ground:
          result.rightColumns.get('ground') ??
          Array.from({ length: this.height }, () => Tile.EMPTY),
        platforms:
          result.rightColumns.get('platforms') ??
          Array.from({ length: this.height }, () => Tile.EMPTY),
        caves:
          result.rightColumns.get('caves') ??
          Array.from({ length: this.height }, () => Tile.EMPTY),
      },
    }
  }

  private buildSupportBackdropTiles(
    tiles: Tile[][],
    caveLayer: Tile[][]
  ): Tile[][] {
    return caveLayer.map((row, rowIndex) =>
      row.map((supportTile, colIndex) => {
        if (supportTile === Tile.CAVE) return Tile.CAVE
        return tiles[rowIndex][colIndex] === Tile.EMPTY ? Tile.EMPTY : Tile.CAVE
      })
    )
  }

  private buildSupportVisualTilemapData(
    supportBackdropTiles: Tile[][]
  ): number[][] {
    const emptyFrame = TILE_RENDER_INDEX[Tile.EMPTY]
    const caveFrame = TILE_RENDER_INDEX[Tile.CAVE]

    return supportBackdropTiles.map((row, rowIndex) =>
      row.map((tile, colIndex) => {
        if (tile !== Tile.CAVE) return emptyFrame
        const resolved = getRenderFrameForTileAt(
          supportBackdropTiles,
          rowIndex,
          colIndex
        )
        return resolved === emptyFrame ? caveFrame : resolved
      })
    )
  }

  private buildSupportForegroundTilemapData(
    tiles: Tile[][],
    caveLayer: Tile[][]
  ): number[][] {
    const emptyFrame = TILE_RENDER_INDEX[Tile.EMPTY]

    return caveLayer.map((row, rowIndex) =>
      row.map((supportTile, colIndex) => {
        if (supportTile !== Tile.CAVE) return emptyFrame
        if (tiles[rowIndex][colIndex] === Tile.EMPTY) return emptyFrame
        if (rowIndex > 0 && tiles[rowIndex - 1][colIndex] !== Tile.EMPTY) {
          return emptyFrame
        }
        return getRenderFrameForTileAt(caveLayer, rowIndex, colIndex)
      })
    )
  }

  private validateLayerColumnLength(column: Tile[], name: string): void {
    if (column.length !== this.height) {
      throw new Error(
        `Expected ${name} right column to contain ${this.height} tiles, received ${column.length}`
      )
    }
  }

  private mergeLayers(layers: Tile[][][]): Tile[][] {
    const merged: Tile[][] = Array.from({ length: this.height }, () =>
      Array.from({ length: this.width }, () => Tile.EMPTY)
    )

    for (const layer of layers) {
      for (let row = 0; row < this.height; row += 1) {
        for (let col = 0; col < this.width; col += 1) {
          if (layer[row][col] !== Tile.EMPTY) {
            merged[row][col] = layer[row][col]
          }
        }
      }
    }

    return merged
  }
}
