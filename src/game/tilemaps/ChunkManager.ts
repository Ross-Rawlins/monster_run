import * as Phaser from 'phaser'
import type {
  Chunk,
  ChunkLifecycle,
  LayerBoundaryColumns,
  WorkerResponse,
} from '../../types/tilemaps'
import { CHUNK_WIDTH_PX, MAX_ACTIVE_CHUNKS, Tile } from './TileTypes'

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
  private worker: Worker
  private readonly activeChunks: ActiveChunk[] = []
  private lastRightColumn: Tile[] | null = null
  private lastLayerRightColumns: LayerBoundaryColumns | null = null
  private lastGroundOpenSectionStyleIndex: number | null = null
  private generating = false
  private pendingRequests = 0
  private nextChunkIndex = 0
  private lastGeneratedChunkIndex: number | null = null
  private lastAttemptCount = 0
  private lastWorkerError: string | null = null
  private pendingWorkerChunkIndex: number | null = null
  private workerStallTimer: ReturnType<typeof setTimeout> | null = null

  constructor(private readonly onChunkReady: ChunkReadyCallback) {
    this.worker = this.createWorker()

    this.pendingRequests = 5
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
    this.clearWorkerStallTimer()
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
      queuedChunkCount: 0,
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
      previousLayerRightColumns: this.lastLayerRightColumns,
      previousGroundOpenSectionStyleIndex: this.lastGroundOpenSectionStyleIndex,
      chunkIndex: this.nextChunkIndex,
    })
  }

  private createWorker(): Worker {
    const worker = new Worker(new URL('./wfc.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = this.handleWorkerMessage.bind(this)
    return worker
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
    this.lastLayerRightColumns = chunk.layerRightColumns ?? null
    this.lastGroundOpenSectionStyleIndex =
      chunk.rightGroundOpenSectionStyleIndex ?? null
    this.nextChunkIndex = chunkIndex + 1

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
    this.lastWorkerError = `Worker stalled while generating chunk ${stalledChunkIndex}; restarting worker and retrying.`
    this.lastAttemptCount = 0
    this.clearWorkerStallTimer()
    this.worker.terminate()
    this.worker = this.createWorker()
    // Re-queue the same chunk index instead of injecting fallback terrain.
    this.pendingRequests += 1
    this.pumpQueue()
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
