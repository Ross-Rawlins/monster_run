import * as Phaser from 'phaser'
import type { Chunk } from '../../types/tilemaps'
import { CharacterRegistry } from '../../characters/CharacterRegistry'
import type { AbstractCharacterDefinition } from '../../characters/AbstractCharacterDefinition'
import {
  SkeletonCharacterActor,
  type TileSolidQuery,
} from './SkeletonCharacterActor'
import { SKELETON_CHARACTER_DEFINITION } from './definitions/SkeletonCharacterDefinition'
import { GRID_HEIGHT, GRID_WIDTH, Tile } from '../tilemaps/TileTypes'

/** How many columns from the right edge of a chunk to scan for a spawn point. */
const SPAWN_RIGHT_COLUMN_RANGE = 32

/**
 * Manages skeleton NPC spawning for the infinite runner world.
 *
 * Unlike zombies (which patrol a bounded surface section), skeletons spawn at
 * the RIGHT edge of each incoming chunk — off-screen ahead of the camera —
 * and then relentlessly pursue the hero by walking left.
 *
 * Because skeletons cross chunk boundaries, the spawner maintains a list of
 * all active tilemap layers and wires up a physics collider between every
 * skeleton and every layer it may traverse. Call onLayerAdded() each time a
 * new chunk layer is attached so colliders are kept current.
 *
 * Cleanup: call destroySkeletonsBefore(worldX) when the chunk manager removes
 * stale chunks — this destroys any skeleton whose X has scrolled off the left.
 */
export class SkeletonSpawner {
  private readonly scene: Phaser.Scene
  private readonly tileQueryFn: TileSolidQuery
  private readonly worldBottom: number
  private readonly occlusionBoundaryY: number
  private readonly skeletonDefinitions: AbstractCharacterDefinition[]

  private readonly skeletons: SkeletonCharacterActor[] = []
  private readonly colliders: Phaser.Physics.Arcade.Collider[] = []
  private activeLayers: Phaser.Tilemaps.TilemapLayer[] = []
  private readonly activeStaticGroups: Phaser.Physics.Arcade.StaticGroup[] = []

  constructor(
    scene: Phaser.Scene,
    tileQueryFn: TileSolidQuery,
    worldBottom: number,
    occlusionBoundaryY: number
  ) {
    this.scene = scene
    this.tileQueryFn = tileQueryFn
    this.worldBottom = worldBottom
    this.occlusionBoundaryY = occlusionBoundaryY
    this.skeletonDefinitions = CharacterRegistry.getAll().filter((d) =>
      d.id.startsWith(SKELETON_CHARACTER_DEFINITION.characterIdPrefix)
    )
  }

  /**
   * Called when a new tilemap layer is attached to the world.
   *
   * Registers the layer so future skeletons receive a collider with it, and
   * adds a collider between the layer and any skeletons that are already alive.
   */
  public onLayerAdded(layer: Phaser.Tilemaps.TilemapLayer): void {
    // Prune any layers that have since been destroyed
    this.activeLayers = this.activeLayers.filter((l) => l.active)
    this.activeLayers.push(layer)

    for (const skeleton of this.skeletons) {
      if (skeleton.active) {
        const collider = this.scene.physics.add.collider(
          skeleton as never,
          layer
        )
        this.colliders.push(collider)
      }
    }
  }

  /**
   * Called when a new chunk's object static group is ready.
   *
   * Wires up a collider between every living skeleton and the group so that
   * skeletons cannot walk through collidable objects (32×32 and 48×48 rocks).
   */
  public onStaticGroupAdded(group: Phaser.Physics.Arcade.StaticGroup): void {
    this.activeStaticGroups.push(group)

    for (const skeleton of this.skeletons) {
      if (skeleton.active) {
        const collider = this.scene.physics.add.collider(
          skeleton as never,
          group
        )
        this.colliders.push(collider)
      }
    }
  }

  /**
   * Attempts to spawn one skeleton near the right edge of the given chunk.
   *
   * Must be called AFTER onLayerAdded() for the same chunk so the new layer
   * is already in activeLayers when the skeleton is created.
   */
  public spawnForChunk(
    chunk: Chunk,
    chunkIndex: number,
    chunkOffsetX: number,
    chunkOffsetY: number,
    tileSizePx: number
  ): void {
    const spawnConfig = SKELETON_CHARACTER_DEFINITION.spawn

    if (chunkIndex < spawnConfig.minSpawnChunkIndex) {
      return
    }

    if (this.skeletonDefinitions.length === 0) {
      return
    }

    const spawnPoint =
      this.findRightEdgeSpawnPoint(chunk.tiles) ??
      this.findFallbackSpawnPoint(chunk.tiles)
    if (!spawnPoint) {
      return
    }

    const definition = this.pickDefinition()
    const spawnX = chunkOffsetX + (spawnPoint.col + 0.5) * tileSizePx
    const spawnY = this.resolveSurfaceAlignedSpawnY(
      spawnPoint.row,
      definition,
      chunkOffsetY,
      tileSizePx
    )

    const skeleton = new SkeletonCharacterActor(
      this.scene,
      spawnX,
      spawnY,
      definition,
      {
        chunkIndex,
        tileSizePx,
        worldBottom: this.worldBottom,
        occlusionBoundaryY: this.occlusionBoundaryY,
        tileQueryFn: this.tileQueryFn,
      }
    )

    // Wire up colliders with every currently active layer so the skeleton
    // interacts with terrain across chunk boundaries.
    for (const layer of this.activeLayers) {
      if (layer.active) {
        const collider = this.scene.physics.add.collider(
          skeleton as never,
          layer
        )
        this.colliders.push(collider)
      }
    }

    // Wire up colliders with every active object static group so the skeleton
    // cannot walk through collidable objects.
    for (const group of this.activeStaticGroups) {
      const collider = this.scene.physics.add.collider(skeleton as never, group)
      this.colliders.push(collider)
    }

    this.skeletons.push(skeleton)
  }

  private resolveSurfaceAlignedSpawnY(
    surfaceRow: number,
    definition: AbstractCharacterDefinition,
    chunkOffsetY: number,
    tileSizePx: number
  ): number {
    const renderScaleY =
      (definition.heightInTiles * tileSizePx) / definition.frameHeight
    const spriteHeightPx = definition.frameHeight * renderScaleY
    const bodyBottomFromSpriteTopPx =
      (definition.body.offsetY + definition.body.height) * renderScaleY
    const surfaceTopY = chunkOffsetY + surfaceRow * tileSizePx

    return surfaceTopY + spriteHeightPx - bodyBottomFromSpriteTopPx
  }

  /** Tick all living skeletons and prune any that have self-destructed. */
  public update(): void {
    this.pruneDestroyedLayersAndColliders()

    for (const skeleton of this.skeletons) {
      if (skeleton.active) {
        skeleton.tick(this.scene.cameras.main)
      }
    }

    let i = 0
    while (i < this.skeletons.length) {
      if (this.skeletons[i].active) {
        i += 1
      } else {
        this.skeletons.splice(i, 1)
      }
    }
  }

  /** Return all active skeletons for debug visualization. */
  public getActiveCharacters(): SkeletonCharacterActor[] {
    return this.skeletons
  }

  /** Destroy all skeletons whose world X has scrolled left of the cleanup boundary. */
  public destroySkeletonsBefore(worldX: number): void {
    let i = 0
    while (i < this.skeletons.length) {
      const skeleton = this.skeletons[i]
      if (skeleton.x < worldX) {
        this.skeletons.splice(i, 1)
        skeleton.destroy()
      } else {
        i += 1
      }
    }
  }

  /** Full teardown — call when the scene shuts down. */
  public destroy(): void {
    for (const collider of this.colliders) {
      collider.destroy()
    }
    this.colliders.length = 0

    for (const skeleton of this.skeletons) {
      skeleton.destroy()
    }
    this.skeletons.length = 0
    this.activeLayers.length = 0
  }

  /**
   * Scans the rightmost SPAWN_RIGHT_COLUMN_RANGE columns of the chunk for the
   * first valid spawn point (ground or platform top), favouring columns closest
   * to the right edge.
   */
  private findRightEdgeSpawnPoint(
    tiles: Tile[][]
  ): { row: number; col: number } | null {
    const startCol = Math.max(0, GRID_WIDTH - SPAWN_RIGHT_COLUMN_RANGE)

    for (let col = GRID_WIDTH - 1; col >= startCol; col -= 1) {
      for (let row = GRID_HEIGHT - 1; row >= 1; row -= 1) {
        const cell = tiles[row][col]
        const above = tiles[row - 1][col]

        // Accept either ground or platform as spawn surface
        if (
          (cell === Tile.GROUND || cell === Tile.PLATFORM) &&
          above === Tile.EMPTY
        ) {
          return { row, col }
        }
      }
    }

    return null
  }

  /**
   * Fallback scan used when the right-edge window has no valid spawn surface.
   * This guarantees skeleton visibility for debugging by picking any top surface.
   */
  private findFallbackSpawnPoint(
    tiles: Tile[][]
  ): { row: number; col: number } | null {
    for (let col = GRID_WIDTH - 1; col >= 0; col -= 1) {
      for (let row = GRID_HEIGHT - 1; row >= 1; row -= 1) {
        const cell = tiles[row][col]
        const above = tiles[row - 1][col]

        if (
          (cell === Tile.GROUND || cell === Tile.PLATFORM) &&
          above === Tile.EMPTY
        ) {
          return { row, col }
        }
      }
    }

    return null
  }

  private pickDefinition(): AbstractCharacterDefinition {
    const index = Math.floor(Math.random() * this.skeletonDefinitions.length)
    return this.skeletonDefinitions[index]
  }

  private pruneDestroyedLayersAndColliders(): void {
    this.activeLayers = this.activeLayers.filter((layer) => {
      if (!layer.active) return false
      const tilemap = (layer as any).tilemap
      return tilemap && tilemap.layers && tilemap.layers.length > 0
    })

    let i = 0
    while (i < this.colliders.length) {
      const collider = this.colliders[i]
      const sprite = collider.object1 as { active?: boolean } | null
      const layer = collider.object2 as any

      const spriteActive = sprite?.active !== false
      const layerValid =
        layer &&
        layer.active === true &&
        layer.tilemap &&
        layer.tilemap.layers &&
        layer.tilemap.layers.length > 0

      if (collider.active && spriteActive && layerValid) {
        i += 1
      } else {
        collider.destroy()
        this.colliders.splice(i, 1)
      }
    }
  }
}
