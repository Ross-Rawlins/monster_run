import type { Cell, Chunk, Direction, GridPosition } from '../../types/tilemaps'
import {
  getInitialOptionsForRow,
  GRID_HEIGHT,
  GRID_WIDTH,
  RULES,
  Tile,
} from './TileTypes'

const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

interface GeneratorOptions {
  seed?: number
  width?: number
  height?: number
}

interface QueueItem extends GridPosition {
  direction?: Direction
}

interface NeighborCell extends GridPosition {
  direction: Direction
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

function pickRandom<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]
}

function isCompatible(
  source: Tile,
  target: Tile,
  direction: Direction
): boolean {
  return (
    RULES[source][direction].includes(target) &&
    RULES[target][OPPOSITE_DIRECTION[direction]].includes(source)
  )
}

export class WFCGenerator {
  private readonly width: number
  private readonly height: number
  private readonly random: () => number
  private readonly grid: Set<Tile>[][]

  constructor(options: GeneratorOptions = {}) {
    this.width = options.width ?? GRID_WIDTH
    this.height = options.height ?? GRID_HEIGHT
    this.random = mulberry32(options.seed ?? Date.now())
    this.grid = Array.from({ length: this.height }, (_, row) => {
      const rowOptions = getInitialOptionsForRow(row)
      return Array.from({ length: this.width }, () => new Set(rowOptions))
    })

    this.seedBorderConstraints()
  }

  public seedLeftColumn(previousRightColumn: Tile[]): void {
    if (previousRightColumn.length !== this.height) {
      throw new Error(
        `Expected previous right column to contain ${this.height} tiles, received ${previousRightColumn.length}`
      )
    }

    for (let y = 0; y < this.height; y++) {
      this.grid[y][0] = new Set([previousRightColumn[y]])
      this.propagate({ x: 0, y })
    }
  }

  public generate(): Chunk {
    while (true) {
      this.assertNoContradictions()
      const target = this.getLowestEntropyCell()

      if (!target) {
        break
      }

      this.collapse(target.x, target.y)
      this.propagate(target)
    }

    return this.exportChunk()
  }

  private seedBorderConstraints(): void {
    for (let x = 0; x < this.width; x++) {
      this.grid[0][x] = new Set([Tile.AIR])
      this.grid[this.height - 1][x] = new Set([Tile.DIRT])
    }

    for (let x = 0; x < this.width; x++) {
      this.propagate({ x, y: 0 })
      this.propagate({ x, y: this.height - 1 })
    }
  }

  private getLowestEntropyCell(): Cell | null {
    let minEntropy = Number.POSITIVE_INFINITY
    const candidates: Cell[] = []

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const options = this.grid[y][x]
        const entropy = options.size

        if (entropy <= 1) {
          continue
        }

        if (entropy < minEntropy) {
          minEntropy = entropy
          candidates.length = 0
          candidates.push({ x, y, options })
          continue
        }

        if (entropy === minEntropy) {
          candidates.push({ x, y, options })
        }
      }
    }

    if (candidates.length === 0) {
      return null
    }

    return pickRandom(candidates, this.random)
  }

  private collapse(x: number, y: number): void {
    const options = Array.from(this.grid[y][x])

    if (options.length === 0) {
      throw new Error(
        `Cannot collapse cell (${x}, ${y}) because it has no valid tiles`
      )
    }

    const chosenTile = pickRandom(options, this.random)
    this.grid[y][x] = new Set([chosenTile])
  }

  private propagate(start: GridPosition): void {
    const queue: QueueItem[] = [start]
    const queued = new Set<string>([`${start.x},${start.y}`])

    for (const current of queue) {
      queued.delete(`${current.x},${current.y}`)

      for (const neighbor of this.getNeighbors(current)) {
        const compatibleOptions = this.getCompatibleOptions(current, neighbor)
        const nextOptions = this.grid[neighbor.y][neighbor.x]

        if (compatibleOptions.size === nextOptions.size) {
          continue
        }

        this.assertCompatibleOptions(current, neighbor, compatibleOptions)
        this.grid[neighbor.y][neighbor.x] = compatibleOptions
        this.enqueueNeighbor(queue, queued, neighbor)
      }
    }
  }

  private getNeighbors(current: GridPosition): NeighborCell[] {
    return [
      { x: current.x, y: current.y - 1, direction: 'up' },
      { x: current.x, y: current.y + 1, direction: 'down' },
      { x: current.x - 1, y: current.y, direction: 'left' },
      { x: current.x + 1, y: current.y, direction: 'right' },
    ].filter((neighbor): neighbor is NeighborCell =>
      this.isInsideGrid(neighbor.x, neighbor.y)
    )
  }

  private getCompatibleOptions(
    current: GridPosition,
    neighbor: NeighborCell
  ): Set<Tile> {
    const currentOptions = this.grid[current.y][current.x]
    const nextOptions = this.grid[neighbor.y][neighbor.x]
    const compatibleOptions = new Set<Tile>()

    for (const candidate of nextOptions) {
      if (
        this.isCandidateCompatible(
          currentOptions,
          candidate,
          neighbor.direction
        )
      ) {
        compatibleOptions.add(candidate)
      }
    }

    return compatibleOptions
  }

  private isCandidateCompatible(
    currentOptions: Set<Tile>,
    candidate: Tile,
    direction: Direction
  ): boolean {
    for (const source of currentOptions) {
      if (isCompatible(source, candidate, direction)) {
        return true
      }
    }

    return false
  }

  private assertCompatibleOptions(
    current: GridPosition,
    neighbor: GridPosition,
    compatibleOptions: Set<Tile>
  ): void {
    if (compatibleOptions.size > 0) {
      return
    }

    throw new Error(
      `WFC contradiction at (${neighbor.x}, ${neighbor.y}) while propagating from (${current.x}, ${current.y})`
    )
  }

  private enqueueNeighbor(
    queue: QueueItem[],
    queued: Set<string>,
    neighbor: GridPosition
  ): void {
    const queueKey = `${neighbor.x},${neighbor.y}`

    if (queued.has(queueKey)) {
      return
    }

    queue.push({ x: neighbor.x, y: neighbor.y })
    queued.add(queueKey)
  }

  private exportChunk(): Chunk {
    const tiles = this.grid.map((row) =>
      row.map((cell) => this.resolveCollapsedTile(cell))
    )

    return {
      tiles,
      rightColumn: tiles.map((row) => row[this.width - 1]),
    }
  }

  private resolveCollapsedTile(cell: Set<Tile>): Tile {
    if (cell.size === 0) {
      throw new Error(
        'Cannot export a chunk containing unresolved contradictions'
      )
    }

    if (cell.size === 1) {
      return Array.from(cell)[0]
    }

    return pickRandom(Array.from(cell), this.random)
  }

  private assertNoContradictions(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x].size === 0) {
          throw new Error(`WFC contradiction detected at (${x}, ${y})`)
        }
      }
    }
  }

  private isInsideGrid(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height
  }
}
