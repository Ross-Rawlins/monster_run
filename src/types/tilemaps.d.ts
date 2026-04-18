import type { Tile } from '../game/tilemaps/TileTypes'

export interface LayerBoundaryColumns {
  ground: Tile[]
  platforms: Tile[]
  caves: Tile[]
}

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
  supportTiles: Tile[][]
  collisionTilemapData?: number[][]
  supportVisualTilemapData?: number[][]
  supportForegroundTilemapData?: number[][]
  rightColumn: Tile[]
  layerRightColumns?: LayerBoundaryColumns
  groundTopStyleByColumn?: number[]
  rightGroundOpenSectionStyleIndex?: number | null
}

export interface WorkerMessage {
  previousRightColumn: Tile[] | null
  previousLayerRightColumns?: LayerBoundaryColumns | null
  previousGroundOpenSectionStyleIndex?: number | null
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
