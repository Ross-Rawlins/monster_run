import type { Chunk, LayerBoundaryColumns } from '../../types/tilemaps'
import {
  GRID_HEIGHT,
  GRID_WIDTH,
  Tile,
  TILE_RENDER_INDEX,
  getRenderFrameForTileAt,
} from './TileTypes'
import { GroundGenerator } from './layers/ground/GroundGenerator'
import { isGroundInternalDebugCell } from './layers/ground/GroundRules'
import { PlatformGenerator } from './layers/platforms/PlatformGenerator'
import { CaveGenerator } from './layers/caves/CaveGenerator'
import { caveRules } from './layers/caves/CaveRules'
import { ObjectGenerator } from './layers/objects/ObjectGenerator'
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

    // Pass ground layer to cave rules so they can check internal ground sections
    caveRules.setGroundTiles(groundLayer)

    // Merge ground and platform into a single terrain grid for the existing Chunk interface.
    const tiles = this.mergeLayers([groundLayer, platformLayer])

    // Restore seeded left column onto the merged terrain for cross-chunk continuity.
    if (this.seededLeftColumn) {
      for (let row = 0; row < this.height; row += 1) {
        tiles[row][0] = this.seededLeftColumn[row]
      }
    }

    const groundTopStyleByColumn = groundGenerator.getTopStyleByColumn()
    // Build extended tile grids so boundary columns resolve with accurate neighbours.
    //
    // Left edge (col 0): if a seeded left column exists it represents the previous
    // chunk's rightmost column.  Prepending it as a virtual west column lets the
    // frame resolver treat col 0 as a continuation tile instead of a left end-cap.
    //
    // Right edge (col width-1): the next chunk will seed its col 0 from this
    // column, so appending the same tile again as a virtual east column makes the
    // resolver treat col width-1 as a continuation tile from the start, eliminating
    // the visible right-cap artefact that appeared before the next chunk arrived.
    const leftExtendedTiles: Tile[][] | null = this.seededLeftColumn
      ? tiles.map((row, ri) => [this.seededLeftColumn![ri], ...row])
      : null
    const leftExtendedStyle: number[] | null =
      leftExtendedTiles && groundTopStyleByColumn
        ? [groundTopStyleByColumn[0] ?? 0, ...groundTopStyleByColumn]
        : null

    const rightBoundaryCol = tiles.map((row) => row[this.width - 1])
    const rightExtendedTiles: Tile[][] = tiles.map((row, ri) => [
      ...row,
      rightBoundaryCol[ri],
    ])
    const rightExtendedStyle: number[] | null = groundTopStyleByColumn
      ? [...groundTopStyleByColumn, groundTopStyleByColumn[this.width - 1] ?? 0]
      : null

    const collisionTilemapData = tiles.map((row, rowIndex) =>
      row.map((_, colIndex) => {
        if (colIndex === 0 && leftExtendedTiles) {
          // Col 0 in extended grid is the virtual west neighbour; resolve at col 1.
          return getRenderFrameForTileAt(leftExtendedTiles, rowIndex, 1, {
            groundStyleBounds: { minCol: 1, maxCol: this.width },
            groundStyleByColumn: leftExtendedStyle ?? undefined,
          })
        }
        if (colIndex === this.width - 1) {
          // Col width in extended grid is the virtual east neighbour; resolve at col width-1.
          return getRenderFrameForTileAt(
            rightExtendedTiles,
            rowIndex,
            this.width - 1,
            {
              groundStyleBounds: { maxCol: this.width - 1 },
              groundStyleByColumn: rightExtendedStyle ?? undefined,
            }
          )
        }
        return getRenderFrameForTileAt(tiles, rowIndex, colIndex, {
          groundStyleByColumn: groundTopStyleByColumn,
        })
      })
    )

    const supportBackdropTiles = this.buildSupportBackdropTiles(caveLayer)
    const objectGeneration = new ObjectGenerator(options).generate(tiles)

    return {
      tiles,
      supportTiles: caveLayer,
      objectAvailabilityGrid: objectGeneration.availabilityGrid,
      objectPlacements: objectGeneration.placements,
      collisionTilemapData,
      supportVisualTilemapData: this.buildSupportVisualTilemapData(
        supportBackdropTiles,
        this.seededLayerLeftColumns?.caves ?? undefined,
        caveLayer.map((row) => row[this.width - 1]) as Tile[]
      ),
      supportForegroundTilemapData: this.buildSupportForegroundTilemapData(
        groundLayer,
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

  private buildSupportBackdropTiles(caveLayer: Tile[][]): Tile[][] {
    return caveLayer.map((row) => [...row])
  }

  private buildSupportVisualTilemapData(
    supportBackdropTiles: Tile[][],
    seededLeftCaveColumn?: Tile[],
    rightBoundaryCaveColumn?: Tile[]
  ): number[][] {
    const emptyFrame = TILE_RENDER_INDEX[Tile.EMPTY]
    const caveFrame = TILE_RENDER_INDEX[Tile.CAVE]

    const leftExtendedTiles: Tile[][] | null = seededLeftCaveColumn
      ? supportBackdropTiles.map((row, ri) => [
          seededLeftCaveColumn[ri] ?? Tile.EMPTY,
          ...row,
        ])
      : null
    const rightExtendedTiles: Tile[][] | null = rightBoundaryCaveColumn
      ? supportBackdropTiles.map((row, ri) => [
          ...row,
          rightBoundaryCaveColumn[ri] ?? Tile.EMPTY,
        ])
      : null

    return supportBackdropTiles.map((row, rowIndex) =>
      row.map((tile, colIndex) => {
        if (tile !== Tile.CAVE) return emptyFrame

        let resolved = getRenderFrameForTileAt(
          supportBackdropTiles,
          rowIndex,
          colIndex
        )
        if (colIndex === 0 && leftExtendedTiles) {
          resolved = getRenderFrameForTileAt(leftExtendedTiles, rowIndex, 1)
        } else if (colIndex === this.width - 1 && rightExtendedTiles) {
          resolved = getRenderFrameForTileAt(
            rightExtendedTiles,
            rowIndex,
            this.width - 1
          )
        }

        return resolved === emptyFrame ? caveFrame : resolved
      })
    )
  }

  private buildSupportForegroundTilemapData(
    groundLayer: Tile[][],
    caveLayer: Tile[][]
  ): number[][] {
    const emptyFrame = TILE_RENDER_INDEX[Tile.EMPTY]
    const caveFrame = TILE_RENDER_INDEX[Tile.CAVE]

    return caveLayer.map((row, rowIndex) =>
      row.map((supportTile, colIndex) => {
        if (supportTile !== Tile.CAVE) return emptyFrame

        // Internal-ground caves should render in front of terrain so the
        // cave silhouette remains visible over the internal fallback fill.
        if (
          groundLayer[rowIndex][colIndex] === Tile.GROUND &&
          isGroundInternalDebugCell(
            groundLayer as number[][],
            rowIndex,
            colIndex
          )
        ) {
          const resolved = getRenderFrameForTileAt(
            caveLayer as number[][],
            rowIndex,
            colIndex
          )
          return resolved === emptyFrame ? caveFrame : resolved
        }

        return emptyFrame
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
