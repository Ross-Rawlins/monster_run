import type { Tile } from '../game/tilemaps/TileTypes'

export type Direction = 'up' | 'down' | 'left' | 'right'

export interface DirectionRuleSet {
  up: Tile[]
  down: Tile[]
  left: Tile[]
  right: Tile[]
}

export interface RuleSet {
  [tile: number]: DirectionRuleSet
}

export interface GridPosition {
  x: number
  y: number
}

export interface Cell extends GridPosition {
  options: ReadonlySet<Tile>
}

export interface Chunk {
  tiles: Tile[][]
  rightColumn: Tile[]
}

export interface WorkerMessage {
  previousRightColumn: Tile[] | null
  chunkIndex: number
}

export interface WorkerResponse {
  chunkIndex: number
  attempts: number
  chunk?: Chunk
  error?: string
}

export interface ChunkLifecycle {
  chunkIndex: number
  rightEdgePx: number
  status: 'generating' | 'active' | 'destroyed'
}
