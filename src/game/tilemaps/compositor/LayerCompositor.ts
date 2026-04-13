import type {
  LayerName,
  ILayerGenerator,
  GeneratorContext,
} from '../contracts/ILayerGenerator'
import { GRID_HEIGHT, GRID_WIDTH, Tile } from '../TileTypes'

export interface CompositorOptions {
  width?: number
  height?: number
  seededLeftColumn?: Tile[] | null
  seededLayerColumns?: Partial<Record<LayerName, Tile[]>> | null
}

export interface LayerEntry {
  name: LayerName
  generator: ILayerGenerator
}

export interface CompositorResult {
  /** Per-layer tile grids in generation order. */
  layers: Map<LayerName, Tile[][]>
  /** Right-most column of each layer, used to seed the next chunk. */
  rightColumns: Map<LayerName, Tile[]>
}

/**
 * Orchestrates terrain generation across ordered layers.
 *
 * Each layer gets its own isolated tile grid. Generators receive a
 * GeneratorContext that contains all previously generated layers via
 * `completedLayers`, allowing later layers to make placement decisions
 * based on earlier layers (e.g., platforms inform cave placement).
 *
 * Generation order matters: pass entries in the order they should run.
 * Recommended order: ground → platforms → caves.
 */
export class LayerCompositor {
  private readonly width: number
  private readonly height: number
  private readonly seededLeftColumn: Tile[] | null
  private readonly seededLayerColumns: Partial<Record<LayerName, Tile[]>>

  constructor(options: CompositorOptions) {
    this.width = options.width ?? GRID_WIDTH
    this.height = options.height ?? GRID_HEIGHT
    this.seededLeftColumn = options.seededLeftColumn ?? null
    this.seededLayerColumns = options.seededLayerColumns ?? {}
  }

  public compose(entries: ReadonlyArray<LayerEntry>): CompositorResult {
    const layers = new Map<LayerName, Tile[][]>()
    const rightColumns = new Map<LayerName, Tile[]>()
    const completedLayers = new Map<
      LayerName,
      ReadonlyArray<ReadonlyArray<Tile>>
    >()

    for (const { name, generator } of entries) {
      const tiles: Tile[][] = Array.from({ length: this.height }, () =>
        Array.from({ length: this.width }, () => Tile.EMPTY)
      )

      const layerSeededLeftColumn =
        this.seededLayerColumns[name] ??
        (name === 'ground' ? this.seededLeftColumn : null)

      if (layerSeededLeftColumn) {
        for (let row = 0; row < this.height; row += 1) {
          tiles[row][0] = layerSeededLeftColumn[row] ?? Tile.EMPTY
        }
      }

      const context: GeneratorContext = {
        seededLeftColumn: layerSeededLeftColumn,
        completedLayers,
      }

      generator.generate(tiles, context)

      layers.set(name, tiles)
      rightColumns.set(
        name,
        tiles.map((row) => row[this.width - 1])
      )
      completedLayers.set(name, tiles)
    }

    return { layers, rightColumns }
  }
}
