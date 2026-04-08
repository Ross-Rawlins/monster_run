/**
 * ChunkBuilder — builds the visual representation of one chunk.
 *
 * A chunk is rendered as a Phaser Container.  The container holds one
 * Image per tile, positioned in local space (origin = chunk left edge,
 * chunk's ground top row).
 *
 * ── Coordinate conventions ────────────────────────────────────────────────
 *   TILE_SIZE    16 px  (source pixels in the atlas)
 *   TILE_SCALE    4     (rendering scale; 1 source px = 4 screen px)
 *   TILE_RENDERED 64 px (= TILE_SIZE × TILE_SCALE, the on-screen tile size)
 *
 * Container.x is set every frame by ChunkManager to:
 *   container.x = chunk.worldX - previewScrollX
 *
 * Container.y is fixed at the scene's groundY (top of the ground band).
 *
 * ── Layers (depth values) ─────────────────────────────────────────────────
 *   Ground fill tiles   depth 8
 *   Surface grass tiles depth 10
 *   Platform tiles      depth 10
 *   Decorations         depth 15   (placed directly in the scene, not container)
 * ─────────────────────────────────────────────────────────────────────────
 */

import * as Phaser from 'phaser'
import { RUNNER_ASSET_KEYS } from '../config/keys'
import type { ActiveChunk, ChunkTemplate, TileNeighbours } from './types'
import { getFrame } from './tileFrames'
import {
  resolveGroundTileRole,
  resolveSurfaceTileRole,
  resolvePlatformSurfaceRole,
} from './tileRules'

// ── Constants ─────────────────────────────────────────────────────────────

export const TILE_SIZE = 16        // source pixels
export const TILE_SCALE = 4        // render scale
export const TILE_RENDERED = TILE_SIZE * TILE_SCALE  // 64 screen px
export const CHUNK_WIDTH_TILES = 20
export const CHUNK_WIDTH = CHUNK_WIDTH_TILES * TILE_RENDERED  // 1280 screen px
export const GROUND_DEPTH_TILES = 3  // how many tile rows of fill below the surface

// ── Grid helpers ──────────────────────────────────────────────────────────

/**
 * Builds a 2D boolean solidity grid for a chunk.
 * Row 0 is the surface row; rows increase downward.
 *
 * @param widthTiles  Total tile columns in the chunk.
 * @param depthTiles  Total tile rows (surface + fill below).
 * @param gaps        Gap configs from the template (tile-column units).
 */
function buildSolidityGrid(
  widthTiles: number,
  depthTiles: number,
  gaps: ChunkTemplate['gaps']
): boolean[][] {
  const grid: boolean[][] = Array.from({ length: depthTiles }, () =>
    new Array<boolean>(widthTiles).fill(true)
  )

  // Carve out gaps — gaps go all the way through all rows
  for (const gap of gaps) {
    for (let row = 0; row < depthTiles; row++) {
      for (let col = gap.startTile; col < gap.startTile + gap.widthTiles; col++) {
        if (col >= 0 && col < widthTiles) {
          grid[row][col] = false
        }
      }
    }
  }

  return grid
}

function getNeighbours(
  grid: boolean[][],
  col: number,
  row: number
): TileNeighbours {
  const rows = grid.length
  const cols = grid[0].length
  return {
    self: grid[row]?.[col] ?? false,
    above: row > 0 ? (grid[row - 1]?.[col] ?? false) : false,
    below: row < rows - 1 ? (grid[row + 1]?.[col] ?? false) : false,
    left: col > 0 ? (grid[row]?.[col - 1] ?? false) : false,
    right: col < cols - 1 ? (grid[row]?.[col + 1] ?? false) : false,
  }
}

// ── Tile image factory ────────────────────────────────────────────────────

function makeTile(
  scene: Phaser.Scene,
  atlasKey: string,
  frame: string,
  localX: number,
  localY: number,
  depth: number
): Phaser.GameObjects.Image {
  return scene.add
    .image(localX, localY, atlasKey, frame)
    .setOrigin(0, 0)
    .setScale(TILE_SCALE)
    .setDepth(depth)
}

// ── Public builder ────────────────────────────────────────────────────────

/**
 * Builds one chunk at `worldX` from the given template and returns an
 * {@link ActiveChunk} ready to be tracked by {@link ChunkManager}.
 *
 * @param scene        The Phaser scene (used to create game objects).
 * @param worldX       Left edge of the chunk in world-space pixels.
 * @param template     The layout template for this chunk.
 * @param groundY      The scene's ground top Y in screen pixels.
 *                     The container will be placed at this Y.
 * @param screenX      Initial screen X = worldX - previewScrollX.
 */
export function buildChunk(
  scene: Phaser.Scene,
  worldX: number,
  template: ChunkTemplate,
  groundY: number,
  screenX: number
): ActiveChunk {
  const { biome, gaps, platforms } = template
  const depthTiles = GROUND_DEPTH_TILES + 1  // surface row + fill rows

  const grid = buildSolidityGrid(CHUNK_WIDTH_TILES, depthTiles, gaps)

  const container = scene.add.container(screenX, groundY)

  // ── Ground fill pass ────────────────────────────────────────────────────
  for (let row = 0; row < depthTiles; row++) {
    for (let col = 0; col < CHUNK_WIDTH_TILES; col++) {
      if (!grid[row][col]) continue

      const neighbours = getNeighbours(grid, col, row)
      const altVariant = (col + row) % 2 === 1
      const role = resolveGroundTileRole(neighbours, altVariant)
      const frame = getFrame(role, biome)

      const tile = makeTile(
        scene,
        RUNNER_ASSET_KEYS.TILE_ATLAS_GROUND,
        frame,
        col * TILE_RENDERED,
        row * TILE_RENDERED,
        8
      )
      container.add(tile)
    }
  }

  // ── Surface (grass) pass ────────────────────────────────────────────────
  for (let col = 0; col < CHUNK_WIDTH_TILES; col++) {
    if (!grid[0][col]) continue

    const neighbours = getNeighbours(grid, col, 0)
    const role = resolveSurfaceTileRole(neighbours)
    if (!role) continue

    const frame = getFrame(role, biome)
    const tile = makeTile(
      scene,
      RUNNER_ASSET_KEYS.TILE_ATLAS_GRASS,
      frame,
      col * TILE_RENDERED,
      0,
      10
    )
    container.add(tile)
  }

  // ── Platform visuals ────────────────────────────────────────────────────
  const decorations: Phaser.GameObjects.Image[] = []

  for (const platform of platforms) {
    const platformY = -(platform.tilesAboveGround * TILE_RENDERED)

    for (let i = 0; i < platform.widthTiles; i++) {
      const col = platform.startTile + i
      const role = resolvePlatformSurfaceRole(i, platform.widthTiles)
      const frame = getFrame(role, biome)

      const tile = makeTile(
        scene,
        RUNNER_ASSET_KEYS.TILE_ATLAS_GRASS,
        frame,
        col * TILE_RENDERED,
        platformY,
        10
      )
      container.add(tile)
    }
  }

  // ── Decorations ─────────────────────────────────────────────────────────
  for (const dec of template.decorations) {
    const decScreenX = screenX + dec.tileCol * TILE_RENDERED
    const decScreenY = groundY - TILE_RENDERED  // one tile above ground top
    const sprite = scene.add
      .image(decScreenX, decScreenY, RUNNER_ASSET_KEYS.OBJECTS_ATLAS, dec.frame)
      .setOrigin(0, 1)
      .setScale(TILE_SCALE)
      .setDepth(dec.depth)
    decorations.push(sprite)
  }

  return {
    worldX,
    rightEdgeWorld: worldX + CHUNK_WIDTH,
    template,
    container,
    decorations,
  }
}

/**
 * Destroys all game objects associated with a chunk.
 * Call this before removing the chunk from the active list.
 */
export function destroyChunk(chunk: ActiveChunk): void {
  chunk.container.destroy(true)
  for (const dec of chunk.decorations) {
    dec.destroy()
  }
}
