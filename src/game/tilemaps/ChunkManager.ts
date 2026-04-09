import * as Phaser from 'phaser'
import type {
  Chunk,
  ChunkLifecycle,
  WorkerResponse,
} from '../../types/tilemaps'
import { CHUNK_WIDTH_PX, MAX_ACTIVE_CHUNKS, Tile } from './TileTypes'

interface ActiveChunk {
  chunk: Chunk
  tilemap: Phaser.Tilemaps.Tilemap
  layer: Phaser.Tilemaps.TilemapLayer
  collider: Phaser.Physics.Arcade.Collider
  staticGroup?: Phaser.Physics.Arcade.StaticGroup | null
  lifecycle: ChunkLifecycle
  rightEdgePx: number
}

type ChunkReadyCallback = (chunk: Chunk, lifecycle: ChunkLifecycle) => void

export class ChunkManager {
  private readonly worker: Worker
  private readonly chunkQueue: Chunk[] = []
  private readonly activeChunks: ActiveChunk[] = []
  private lastRightColumn: Tile[] | null = null
  private generating = false
  private pendingRequests = 0
  private nextChunkIndex = 0

  constructor(private readonly onChunkReady: ChunkReadyCallback) {
    this.worker = new Worker(new URL('./wfc.worker.ts', import.meta.url), {
      type: 'module',
    })
    this.worker.onmessage = this.handleWorkerMessage.bind(this)

    this.pendingRequests = 2
    this.pumpQueue()
  }

  public triggerNextChunk(): void {
    this.pendingRequests += 1
    this.pumpQueue()
  }

  public registerActiveChunk(activeChunk: ActiveChunk): void {
    this.activeChunks.push(activeChunk)
    this.activeChunks.sort(
      (left, right) => left.lifecycle.chunkIndex - right.lifecycle.chunkIndex
    )

    if (this.activeChunks.length > MAX_ACTIVE_CHUNKS) {
      console.warn(
        `Active chunk count exceeded ${MAX_ACTIVE_CHUNKS}; current count is ${this.activeChunks.length}`
      )
    }
  }

  public destroyStaleChunks(cameraScrollX: number): void {
    let staleCount = 0

    for (const activeChunk of this.activeChunks) {
      if (activeChunk.rightEdgePx >= cameraScrollX) {
        continue
      }

      staleCount += 1
      activeChunk.lifecycle.status = 'destroyed'
      activeChunk.collider.destroy()
      activeChunk.staticGroup?.clear(true, true)
      activeChunk.layer.destroy()
      activeChunk.tilemap.destroy()
    }

    if (staleCount === 0) {
      return
    }

    this.activeChunks.splice(0, staleCount)
  }

  public destroy(): void {
    this.worker.terminate()

    for (const activeChunk of this.activeChunks) {
      activeChunk.lifecycle.status = 'destroyed'
      activeChunk.collider.destroy()
      activeChunk.staticGroup?.clear(true, true)
      activeChunk.layer.destroy()
      activeChunk.tilemap.destroy()
    }

    this.activeChunks.length = 0
    this.chunkQueue.length = 0
  }

  private pumpQueue(): void {
    if (this.generating || this.pendingRequests === 0) {
      return
    }

    this.generating = true
    this.pendingRequests -= 1
    this.worker.postMessage({
      previousRightColumn: this.lastRightColumn,
      chunkIndex: this.nextChunkIndex,
    })
  }

  private handleWorkerMessage(event: MessageEvent<WorkerResponse>): void {
    const { chunk, chunkIndex, error } = event.data
    this.generating = false

    if (!chunk || error) {
      console.warn(
        error ?? `Chunk ${chunkIndex} generation failed with no error message`
      )
      this.pendingRequests += 1
      this.pumpQueue()
      return
    }

    this.lastRightColumn = chunk.rightColumn
    this.nextChunkIndex = chunkIndex + 1
    this.chunkQueue.push(chunk)

    const lifecycle: ChunkLifecycle = {
      chunkIndex,
      rightEdgePx: (chunkIndex + 1) * CHUNK_WIDTH_PX,
      status: 'active',
    }

    this.onChunkReady(chunk, lifecycle)
    this.pumpQueue()
  }
}

export type { ActiveChunk }
