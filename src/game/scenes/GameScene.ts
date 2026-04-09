import * as Phaser from 'phaser'
import { RUNNER_ASSET_KEYS } from '../../config/keys'
import { ParallaxBackgroundManager } from '../../managers/ParallaxBackgroundManager'
import type { Chunk, ChunkLifecycle } from '../../types/tilemaps'
import { ChunkManager, type ActiveChunk } from '../tilemaps/ChunkManager'
import {
  CHUNK_HEIGHT_PX,
  CHUNK_WIDTH_PX,
  COLLIDABLE_TILES,
  GRID_HEIGHT,
  GRID_WIDTH,
  MAX_ACTIVE_CHUNKS,
  Tile,
  TILE_RENDER_INDEX,
  TILE_SIZE_PX,
} from '../tilemaps/TileTypes'

const PLAYER_START_X = TILE_SIZE_PX * 6
const PLAYER_WIDTH = 12
const PLAYER_HEIGHT = 24
const PLAYER_RUN_SPEED = 180
const PLAYER_JUMP_VELOCITY = -360
const WORLD_PADDING_PX = CHUNK_WIDTH_PX * 2
const TILESET_KEY = 'runner-tileset'

/** Colour used per tile type in the debug overlay (semi-transparent fill). */
const DEBUG_TILE_COLORS: Record<Tile, number | null> = {
  [Tile.AIR]: null,
  [Tile.GROUND]: 0x8b4513,
  [Tile.DIRT]: 0x5c3d1e,
  [Tile.PLATFORM]: 0x4a9f4a,
  [Tile.WALL]: 0x808080,
  [Tile.SPIKE]: 0xff4444,
  [Tile.COLUMN]: 0x6060a0,
  [Tile.CRATE]: 0xd4a017,
  [Tile.COIN]: 0xffd700,
  [Tile.BRIDGE]: 0xa0522d,
}

/** Label drawn on each debug tile cell. */
const DEBUG_TILE_LABELS: Record<Tile, string> = {
  [Tile.AIR]: '',
  [Tile.GROUND]: 'G',
  [Tile.DIRT]: 'D',
  [Tile.PLATFORM]: 'P',
  [Tile.WALL]: 'W',
  [Tile.SPIKE]: 'Sp',
  [Tile.COLUMN]: 'Co',
  [Tile.CRATE]: 'Cr',
  [Tile.COIN]: '$',
  [Tile.BRIDGE]: 'Br',
}

type RunnerBody = Phaser.Physics.Arcade.Body
type RunnerSprite = Phaser.GameObjects.Rectangle & { body: RunnerBody }

export default class GameScene extends Phaser.Scene {
  private chunkManager!: ChunkManager
  private player!: RunnerSprite
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private parallaxManager!: ParallaxBackgroundManager
  private debugKey!: Phaser.Input.Keyboard.Key
  private debugOverlayGraphics: Phaser.GameObjects.Graphics | null = null
  private debugOverlayTexts: Phaser.GameObjects.Text[] = []
  private debugEnabled = false
  /** Pixel Y where the WFC tilemap chunk starts — fills from here to screen bottom */
  private chunkOffsetY = 0
  private nextChunkTriggerX = CHUNK_WIDTH_PX * 0.5
  private maxWorldRightEdge = CHUNK_WIDTH_PX
  private hasPlacedSpawn = false

  constructor() {
    super('GAME_SCENE')
  }

  public preload(): void {
    this.load.image(TILESET_KEY, 'assets/tiles.png')
    this.load.atlas(
      RUNNER_ASSET_KEYS.BACKGROUND_ATLAS,
      'assets/background.png',
      'assets/background.json'
    )
  }

  public create(): void {
    const sw = this.scale.width
    const sh = this.scale.height

    // How many pixels of sky sit above the tile grid
    this.chunkOffsetY = Math.max(0, sh - CHUNK_HEIGHT_PX)

    this.cameras.main.setBackgroundColor('#1a1a2e')
    const keyboard = this.input.keyboard

    if (!keyboard) {
      throw new Error('Keyboard input is unavailable in GameScene')
    }

    this.cursors = keyboard.createCursorKeys()
    this.debugKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)

    // Parallax background — rendered behind everything (depth < 0)
    this.parallaxManager = new ParallaxBackgroundManager(this, sw, sh)

    const playerShape = this.add.rectangle(
      PLAYER_START_X,
      this.chunkOffsetY + TILE_SIZE_PX * 4,
      PLAYER_WIDTH,
      PLAYER_HEIGHT,
      0xffd166
    )

    this.physics.add.existing(playerShape)
    this.player = playerShape as RunnerSprite
    this.player.setOrigin(0.5, 1)

    const body = this.player.body
    body.setCollideWorldBounds(false)
    body.setSize(PLAYER_WIDTH, PLAYER_HEIGHT)
    body.setAllowGravity(false)

    // World bounds: height allows falling below screen
    this.physics.world.setBounds(0, 0, WORLD_PADDING_PX, sh + TILE_SIZE_PX * 4)
    // Camera bounds: no vertical scroll — full height is always visible
    this.cameras.main.setBounds(0, 0, WORLD_PADDING_PX, sh)
    this.cameras.main.roundPixels = true

    // HUD (fixed to camera)
    this.add
      .text(12, 12, 'SPACE = Jump  |  D = Tile debug overlay', {
        fontSize: '12px',
        color: '#ffffff',
      })
      .setAlpha(0.6)
      .setScrollFactor(0)
      .setDepth(200)

    this.chunkManager = new ChunkManager((chunk, lifecycle) => {
      this.attachChunk(chunk, lifecycle)
    })

    this.events.once('shutdown', () => {
      this.chunkManager.destroy()
      this.parallaxManager.destroy()
      this.clearDebugOverlay()
    })
  }

  public update(): void {
    if (!this.hasPlacedSpawn) {
      return
    }

    const body = this.player.body
    body.setVelocityX(PLAYER_RUN_SPEED)

    if (
      Phaser.Input.Keyboard.JustDown(this.cursors.space ?? null) &&
      body.blocked.down
    ) {
      body.setVelocityY(PLAYER_JUMP_VELOCITY)
    }

    const cameraScrollX = this.cameras.main.scrollX
    this.parallaxManager.update(cameraScrollX)
    this.chunkManager.destroyStaleChunks(cameraScrollX)

    if (this.player.x > this.nextChunkTriggerX) {
      this.chunkManager.triggerNextChunk()
      // Pre-extend world/camera bounds so the camera isn't blocked while
      // the worker finishes generating the incoming chunk.
      this.nextChunkTriggerX += CHUNK_WIDTH_PX
      this.preExtendWorldBounds(this.nextChunkTriggerX + CHUNK_WIDTH_PX)
    }

    if (Phaser.Input.Keyboard.JustDown(this.debugKey)) {
      this.debugEnabled = !this.debugEnabled
      if (!this.debugEnabled) {
        this.clearDebugOverlay()
      }
    }

    if (this.player.y > this.scale.height + TILE_SIZE_PX * 4) {
      this.scene.restart()
    }
  }

  private attachChunk(chunk: Chunk, lifecycle: ChunkLifecycle): void {
    const tilemapData = chunk.tiles.map((row) =>
      row.map((tile) => TILE_RENDER_INDEX[tile])
    )
    const tilemap = this.make.tilemap({
      data: tilemapData,
      tileWidth: TILE_SIZE_PX,
      tileHeight: TILE_SIZE_PX,
    })
    // Pass key and tile dimensions explicitly — required for plain-image tilesets
    // in data-based tilemaps (Phaser 3.x).
    const tileset = tilemap.addTilesetImage(
      TILESET_KEY,
      TILESET_KEY,
      TILE_SIZE_PX,
      TILE_SIZE_PX,
      0,
      0
    )

    if (!tileset) {
      throw new Error(
        `Unable to create tileset using texture key ${TILESET_KEY}`
      )
    }

    const layer = tilemap.createLayer(
      0,
      tileset,
      lifecycle.chunkIndex * CHUNK_WIDTH_PX,
      this.chunkOffsetY
    )

    if (!layer) {
      throw new Error(
        `Unable to create tilemap layer for chunk ${lifecycle.chunkIndex}`
      )
    }

    layer.setDepth(1)
    layer.setCollision(this.getCollisionTileIndices())

    const collider = this.physics.add.collider(this.player, layer)
    const activeChunk: ActiveChunk = {
      chunk,
      tilemap,
      layer,
      collider,
      lifecycle,
      rightEdgePx: lifecycle.rightEdgePx,
    }

    this.chunkManager.registerActiveChunk(activeChunk)
    this.updateWorldBounds(lifecycle.rightEdgePx)
    this.drawDebugChunkOverlay(chunk, lifecycle.chunkIndex)

    if (!this.hasPlacedSpawn) {
      this.placePlayerSpawn(chunk)
    }

    if (lifecycle.chunkIndex + 1 > MAX_ACTIVE_CHUNKS) {
      console.debug(
        `Chunk ${lifecycle.chunkIndex} attached; cleanup should keep active chunks near ${MAX_ACTIVE_CHUNKS}`
      )
    }
  }

  private placePlayerSpawn(chunk: Chunk): void {
    const spawnColumn = 6
    const groundY = this.findSpawnGroundY(chunk, spawnColumn)
    const body = this.player.body

    this.player.setPosition(PLAYER_START_X, groundY)
    body.reset(PLAYER_START_X, groundY)
    body.setAllowGravity(true)
    this.hasPlacedSpawn = true
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12, -220, 0)
  }

  private findSpawnGroundY(chunk: Chunk, column: number): number {
    for (let row = 0; row < GRID_HEIGHT; row++) {
      const tile = chunk.tiles[row][column]

      if (!COLLIDABLE_TILES.has(tile)) {
        continue
      }

      return this.chunkOffsetY + row * TILE_SIZE_PX - 2
    }

    return this.chunkOffsetY + CHUNK_HEIGHT_PX - TILE_SIZE_PX * 2
  }

  private updateWorldBounds(rightEdgePx: number): void {
    this.maxWorldRightEdge = Math.max(this.maxWorldRightEdge, rightEdgePx)
    const worldWidth = this.maxWorldRightEdge + WORLD_PADDING_PX
    const sh = this.scale.height
    this.physics.world.setBounds(0, 0, worldWidth, sh + TILE_SIZE_PX * 4)
    this.cameras.main.setBounds(0, 0, worldWidth, sh)
  }

  /** Optimistically widen bounds so the camera can scroll while the worker
   *  is still generating the next incoming chunk. */
  private preExtendWorldBounds(estimatedRightEdge: number): void {
    const worldWidth = estimatedRightEdge + WORLD_PADDING_PX
    const sh = this.scale.height
    this.physics.world.setBounds(0, 0, worldWidth, sh + TILE_SIZE_PX * 4)
    this.cameras.main.setBounds(0, 0, worldWidth, sh)
  }

  private getCollisionTileIndices(): number[] {
    return Array.from(COLLIDABLE_TILES)
      .map((tile) => TILE_RENDER_INDEX[tile])
      .filter((tileIndex) => tileIndex >= 0)
  }

  /**
   * Draw a coloured rectangle + label for every non-AIR tile in a chunk.
   * Toggled with the D key at runtime; helps when tuning WFC adjacency rules.
   */
  private drawDebugChunkOverlay(chunk: Chunk, chunkIndex: number): void {
    if (!this.debugEnabled) {
      return
    }

    if (!this.debugOverlayGraphics) {
      this.debugOverlayGraphics = this.add.graphics().setDepth(100)
    }

    const offsetX = chunkIndex * CHUNK_WIDTH_PX

    for (let row = 0; row < GRID_HEIGHT; row++) {
      for (let col = 0; col < GRID_WIDTH; col++) {
        const tile = chunk.tiles[row][col]
        const color = DEBUG_TILE_COLORS[tile]

        if (color === null) {
          continue
        }

        const x = offsetX + col * TILE_SIZE_PX
        const y = this.chunkOffsetY + row * TILE_SIZE_PX

        this.debugOverlayGraphics.fillStyle(color, 0.45)
        this.debugOverlayGraphics.fillRect(x, y, TILE_SIZE_PX, TILE_SIZE_PX)

        const label = DEBUG_TILE_LABELS[tile]

        if (label) {
          const text = this.add
            .text(
              x + TILE_SIZE_PX * 0.5,
              this.chunkOffsetY + y + TILE_SIZE_PX * 0.5,
              label,
              {
                fontSize: '6px',
                color: '#ffffff',
                resolution: 2,
              }
            )
            .setOrigin(0.5, 0.5)
            .setDepth(101)

          this.debugOverlayTexts.push(text)
        }
      }
    }
  }

  /** Remove all debug graphics and text objects. */
  private clearDebugOverlay(): void {
    this.debugOverlayGraphics?.destroy()
    this.debugOverlayGraphics = null
    this.debugOverlayTexts.forEach((t) => {
      t.destroy()
    })
    this.debugOverlayTexts = []
  }
}
