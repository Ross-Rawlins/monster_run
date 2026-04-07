import * as Phaser from 'phaser'
import { TerrainChunkSpec } from '../../world/terrain/types/terrainGeneratorTypes'
import { TileOccupancy } from '../../world/terrain/types/terrainDebugTypes'

export interface TerrainColliderSlot {
  rect: Phaser.GameObjects.Rectangle
  worldX: number
  worldY: number
  width: number
  active: boolean
}

export interface TerrainChunkSlot {
  visual: Phaser.GameObjects.RenderTexture
  colliders: TerrainColliderSlot[]
  debugText: Phaser.GameObjects.Text
  chunkIndex: number | null
  spec: TerrainChunkSpec | null
  occupancy: TileOccupancy[]
}

export interface TerrainResetOptions {
  seed?: number
}
