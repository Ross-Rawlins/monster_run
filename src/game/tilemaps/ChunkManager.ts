import * as Phaser from 'phaser'
import type {
  Chunk,
  ChunkLifecycle,
  WorkerResponse,
} from '../../types/tilemaps'
import {
  CHUNK_WIDTH_PX,
  GRID_HEIGHT,
  GRID_WIDTH,
  MAX_ACTIVE_CHUNKS,
  Tile,
} from './TileTypes'

const WORKER_STALL_TIMEOUT_MS = 1500

interface ActiveChunk {
  chunk: Chunk
  tilemap: Phaser.Tilemaps.Tilemap
  layer: Phaser.Tilemaps.TilemapLayer
  visualTilemap?: Phaser.Tilemaps.Tilemap
  visualLayer?: Phaser.Tilemaps.TilemapLayer
  foregroundVisualTilemap?: Phaser.Tilemaps.Tilemap
  foregroundVisualLayer?: Phaser.Tilemaps.TilemapLayer
  collider: Phaser.Physics.Arcade.Collider
  staticGroup?: Phaser.Physics.Arcade.StaticGroup | null
  lifecycle: ChunkLifecycle
  rightEdgePx: number
}

interface ChunkManagerDiagnostics {
  generating: boolean
  pendingRequests: number
  nextChunkIndex: number
  activeChunkCount: number
  queuedChunkCount: number
  lastGeneratedChunkIndex: number | null
  lastAttemptCount: number
  lastWorkerError: string | null
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
  private lastGeneratedChunkIndex: number | null = null
  private lastAttemptCount = 0
  private lastWorkerError: string | null = null
  private pendingWorkerChunkIndex: number | null = null
  private workerStallTimer: ReturnType<typeof setTimeout> | null = null

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
      activeChunk.foregroundVisualLayer?.destroy()
      activeChunk.foregroundVisualTilemap?.destroy()
      activeChunk.visualLayer?.destroy()
      activeChunk.visualTilemap?.destroy()
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
      activeChunk.foregroundVisualLayer?.destroy()
      activeChunk.foregroundVisualTilemap?.destroy()
      activeChunk.visualLayer?.destroy()
      activeChunk.visualTilemap?.destroy()
      activeChunk.layer.destroy()
      activeChunk.tilemap.destroy()
    }

    this.activeChunks.length = 0
    this.chunkQueue.length = 0
  }

  public getActiveChunksSnapshot(): ActiveChunk[] {
    return [...this.activeChunks]
  }

  public getDiagnostics(): ChunkManagerDiagnostics {
    return {
      generating: this.generating,
      pendingRequests: this.pendingRequests,
      nextChunkIndex: this.nextChunkIndex,
      activeChunkCount: this.activeChunks.length,
      queuedChunkCount: this.chunkQueue.length,
      lastGeneratedChunkIndex: this.lastGeneratedChunkIndex,
      lastAttemptCount: this.lastAttemptCount,
      lastWorkerError: this.lastWorkerError,
    }
  }

  private pumpQueue(): void {
    if (this.generating || this.pendingRequests === 0) {
      return
    }

    this.generating = true
    this.pendingRequests -= 1
    this.pendingWorkerChunkIndex = this.nextChunkIndex

    this.clearWorkerStallTimer()
    this.workerStallTimer = setTimeout(() => {
      this.handleWorkerStall()
    }, WORKER_STALL_TIMEOUT_MS)

    this.worker.postMessage({
      previousRightColumn: this.lastRightColumn,
      chunkIndex: this.nextChunkIndex,
    })
  }

  private handleWorkerMessage(event: MessageEvent<WorkerResponse>): void {
    const { chunk, chunkIndex, attempts, error } = event.data

    if (chunkIndex < this.nextChunkIndex) {
      return
    }

    this.generating = false
    this.pendingWorkerChunkIndex = null
    this.clearWorkerStallTimer()
    this.lastAttemptCount = attempts

    if (!chunk) {
      this.lastWorkerError =
        error ?? `Chunk ${chunkIndex} generation failed with no error message`
      console.warn(this.lastWorkerError)
      this.pendingRequests += 1
      this.pumpQueue()
      return
    }

    this.lastWorkerError = error ?? null
    if (error) {
      console.warn(error)
    }
    this.lastGeneratedChunkIndex = chunkIndex
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

  private handleWorkerStall(): void {
    if (!this.generating || this.pendingWorkerChunkIndex === null) {
      return
    }

    const stalledChunkIndex = this.pendingWorkerChunkIndex
    this.generating = false
    this.pendingWorkerChunkIndex = null
    this.lastWorkerError = `Worker stalled while generating chunk ${stalledChunkIndex}; using fallback terrain.`

    const fallbackChunk = this.buildFallbackChunk()
    this.lastGeneratedChunkIndex = stalledChunkIndex
    this.lastAttemptCount = 0
    this.lastRightColumn = fallbackChunk.rightColumn
    this.nextChunkIndex = stalledChunkIndex + 1
    this.chunkQueue.push(fallbackChunk)

    const lifecycle: ChunkLifecycle = {
      chunkIndex: stalledChunkIndex,
      rightEdgePx: (stalledChunkIndex + 1) * CHUNK_WIDTH_PX,
      status: 'active',
    }

    this.onChunkReady(fallbackChunk, lifecycle)
    this.pumpQueue()
  }

  private buildFallbackChunk(): Chunk {
    const groundHeight = 4
    const groundStartRow = GRID_HEIGHT - groundHeight
    const tiles: Tile[][] = Array.from({ length: GRID_HEIGHT }, (_, row) =>
      Array.from({ length: GRID_WIDTH }, () =>
        row >= groundStartRow ? Tile.GROUND : Tile.EMPTY
      )
    )
    const supportTiles: Tile[][] = Array.from({ length: GRID_HEIGHT }, () =>
      Array.from({ length: GRID_WIDTH }, () => Tile.EMPTY)
    )

    return {
      tiles,
      supportTiles,
      rightColumn: tiles.map((row) => row[GRID_WIDTH - 1]),
    }
  }

  private clearWorkerStallTimer(): void {
    if (!this.workerStallTimer) {
      return
    }

    clearTimeout(this.workerStallTimer)
    this.workerStallTimer = null
  }
}

export type { ActiveChunk, ChunkManagerDiagnostics }
