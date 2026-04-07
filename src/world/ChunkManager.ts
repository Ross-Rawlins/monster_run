/**
 * ChunkManager — owns the lifecycle of all active chunks.
 *
 * ── Responsibilities ──────────────────────────────────────────────────────
 *   • Spawns new chunks ahead of the player based on `previewScrollX`.
 *   • Repositions chunk containers (screen X = worldX − previewScrollX).
 *   • Manages a recycled pool of static platform physics bodies so that
 *     platforms in active chunks have proper Arcade Physics collisions.
 *   • Destroys chunks that have scrolled fully off the left edge.
 *
 * ── Platform physics pool ─────────────────────────────────────────────────
 *   Static physics bodies cannot move once created in Phaser's Arcade
 *   engine, so we use a fixed-size pool of Rectangles whose static bodies
 *   are reset each frame to match visible platform positions.
 *   The collider between the player and the pool group is registered once
 *   in the scene and remains valid for the lifetime of the run.
 *
 * ── Gap death zone ────────────────────────────────────────────────────────
 *   The main ground physics rectangle is kept by InfiniteRunnerScene.
 *   When the player falls into a gap (no ground tiles), gravity carries
 *   them below the screen.  InfiniteRunnerScene monitors player.y and
 *   triggers a respawn.
 * ─────────────────────────────────────────────────────────────────────────
 */

import * as Phaser from 'phaser'
import type { ActiveChunk } from './types'
import {
  buildChunk,
  destroyChunk,
  CHUNK_WIDTH,
  CHUNK_WIDTH_TILES,
  TILE_RENDERED,
} from './ChunkBuilder'
import { pickTemplate } from './chunkTemplates'
import { getDifficultyParams } from './difficultyScale'

/** How many chunks ahead of the visible screen edge to keep spawned. */
const SPAWN_LOOK_AHEAD = 2

/** How many chunks behind the left screen edge to keep before destroying. */
const DESTROY_LOOK_BEHIND = 1

/** Maximum number of platform physics bodies in the recycled pool. */
const PLATFORM_POOL_SIZE = 24

export class ChunkManager {
  private readonly chunks: ActiveChunk[] = []
  private nextChunkWorldX = 0
  private chunksGenerated = 0

  /** Recycled pool group — add a collider against the player in the scene. */
  public readonly platformGroup: Phaser.Physics.Arcade.StaticGroup

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly groundY: number,
    private readonly screenWidth: number
  ) {
    // Create the platform physics pool
    this.platformGroup = scene.physics.add.staticGroup()

    for (let i = 0; i < PLATFORM_POOL_SIZE; i++) {
      // Invisible 1×1 rectangle; sized/moved each frame
      const rect = scene.add.rectangle(-9999, -9999, 1, 1)
      this.platformGroup.add(rect, true)
    }

    // Pre-populate so the world is visible before the first update
    this.spawnChunk(0)
    this.spawnChunk(0)
    this.spawnChunk(0)
  }

  // ── Public update ──────────────────────────────────────────────────────

  /**
   * Call once per frame from the scene's `update()`.
   *
   * @param previewScrollX  The virtual camera scroll position (world units).
   */
  public update(previewScrollX: number): void {
    this.spawnAhead(previewScrollX)
    this.repositionChunks(previewScrollX)
    this.destroyBehind(previewScrollX)
    this.syncPlatformBodies(previewScrollX)
  }

  /**
   * Returns whether the player's world X is inside any gap in any active chunk.
   * Used by the scene to decide whether to disable the base ground collision.
   *
   * @param playerWorldX  previewScrollX + player's screen X.
   */
  public isPlayerInGap(playerWorldX: number): boolean {
    for (const chunk of this.chunks) {
      if (
        playerWorldX < chunk.worldX ||
        playerWorldX >= chunk.rightEdgeWorld
      ) {
        continue
      }
      // Local tile column of the player within this chunk
      const localX = playerWorldX - chunk.worldX
      const col = Math.floor(localX / TILE_RENDERED)

      for (const gap of chunk.template.gaps) {
        if (col >= gap.startTile && col < gap.startTile + gap.widthTiles) {
          return true
        }
      }
    }
    return false
  }

  /** Destroys all active chunks — call on scene shutdown. */
  public destroy(): void {
    for (const chunk of this.chunks) {
      destroyChunk(chunk)
    }
    this.chunks.length = 0
    this.platformGroup.destroy(true)
  }

  // ── Private helpers ────────────────────────────────────────────────────

  private spawnAhead(previewScrollX: number): void {
    const spawnUntil =
      previewScrollX + this.screenWidth * SPAWN_LOOK_AHEAD + CHUNK_WIDTH
    while (this.nextChunkWorldX < spawnUntil) {
      this.spawnChunk(previewScrollX)
    }
  }

  private spawnChunk(previewScrollX: number): void {
    const worldX = this.nextChunkWorldX
    const screenX = worldX - previewScrollX
    const template = pickTemplate(this.chunksGenerated)

    const chunk = buildChunk(
      this.scene,
      worldX,
      template,
      this.groundY,
      screenX
    )

    this.chunks.push(chunk)
    this.nextChunkWorldX += CHUNK_WIDTH
    this.chunksGenerated += 1

    // Expose difficulty params for future use (e.g., enemy spawning)
    void getDifficultyParams(this.chunksGenerated)
  }

  private repositionChunks(previewScrollX: number): void {
    for (const chunk of this.chunks) {
      const screenX = chunk.worldX - previewScrollX
      chunk.container.x = screenX

      // Reposition decoration sprites that live outside the container
      for (let i = 0; i < chunk.decorations.length; i++) {
        const dec = chunk.template.decorations[i]
        if (!dec) continue
        chunk.decorations[i].x = screenX + dec.tileCol * TILE_RENDERED
      }
    }
  }

  private destroyBehind(previewScrollX: number): void {
    const destroyBefore = previewScrollX - CHUNK_WIDTH * DESTROY_LOOK_BEHIND

    for (let i = this.chunks.length - 1; i >= 0; i--) {
      const chunk = this.chunks[i]
      if (chunk.rightEdgeWorld < destroyBefore) {
        destroyChunk(chunk)
        this.chunks.splice(i, 1)
      }
    }
  }

  /**
   * Resets all platform pool bodies to −9999, then assigns them to the
   * visible platforms in active chunks based on current screen positions.
   */
  private syncPlatformBodies(previewScrollX: number): void {
    const children = this.platformGroup.getChildren()

    // Park every body off-screen first
    for (const child of children) {
      const go = child as Phaser.GameObjects.Rectangle
      go.setPosition(-9999, -9999)
      go.setSize(1, 1)
      ;(go.body as Phaser.Physics.Arcade.StaticBody).reset(-9999, -9999)
    }

    let poolIndex = 0

    for (const chunk of this.chunks) {
      const chunkScreenX = chunk.worldX - previewScrollX

      for (const platform of chunk.template.platforms) {
        if (poolIndex >= children.length) break

        const go = children[poolIndex++] as Phaser.GameObjects.Rectangle
        const px =
          chunkScreenX + platform.startTile * TILE_RENDERED
        const py =
          this.groundY - platform.tilesAboveGround * TILE_RENDERED
        const pw = platform.widthTiles * TILE_RENDERED
        const ph = TILE_RENDERED

        go.setPosition(px + pw * 0.5, py + ph * 0.5)
        go.setSize(pw, ph)

        const body = go.body as Phaser.Physics.Arcade.StaticBody
        body.reset(px, py)
        body.setSize(pw, ph)
      }
    }

    // Refresh the static group so moved bodies are recalculated
    this.platformGroup.refresh()
  }

  // ── Debug / info ───────────────────────────────────────────────────────

  public get activeChunkCount(): number {
    return this.chunks.length
  }

  public get totalChunksGenerated(): number {
    return this.chunksGenerated
  }

  public get currentDifficulty() {
    return getDifficultyParams(this.chunksGenerated)
  }

  /**
   * Returns the number of tiles in the chunk grid width.
   * Exposed so templates/tests can reference it without importing ChunkBuilder.
   */
  public static get chunkWidthTiles(): number {
    return CHUNK_WIDTH_TILES
  }
}
