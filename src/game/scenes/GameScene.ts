import * as Phaser from 'phaser'
import { INFINITE_RUNNER_COLORS } from '../../config/colors'
import { DEBUG_GRID_STYLE } from '../../config/debugGrid'
import { RUNNER_ASSET_KEYS } from '../../config/keys'
import {
  createFullScreenGradientOverlay,
  type FullScreenGradientOverlayHandle,
} from '../render/createFullScreenGradientOverlay'
import { ParallaxBackgroundManager } from '../../managers/ParallaxBackgroundManager'
import type { Chunk, ChunkLifecycle } from '../../types/tilemaps'
import {
  ChunkManager,
  type ActiveChunk,
  type ChunkManagerDiagnostics,
} from '../tilemaps/ChunkManager'
import {
  GROUND_INTERNAL_DEBUG_OFFSET_TILES,
  isGroundInternalDebugCell,
  isGroundSeparatorCell,
} from '../tilemaps/layers/ground/GroundRules'
import { OBJECT_AVAILABILITY_OPEN } from '../tilemaps/layers/objects/ObjectConfig'
import { resolveCaveCapTopEdgeFrame } from '../tilemaps/layers/caves/CaveRules'
import {
  COLLIDABLE_TILES,
  getCollisionFrameIndicesForTile,
  getRenderFrameForTileAt,
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
const CHUNK_TRIGGER_AHEAD_RATIO = 0.7
const CHUNK_PREFETCH_AHEAD = 2
const CHUNK_CLEANUP_BEHIND = 1
const WORLD_PADDING_CHUNKS = 2
const TILESET_KEY = 'runner-tileset'
const RUNTIME_HUD_REFRESH_MS = 100
const DEBUG_GRID_ROWS = 20
const DEBUG_GRID_COLUMNS = 60
const SHOW_EMPTY_DEBUG_LABELS = false
const SHOW_DEBUG_LABELS = false
const SHOW_PARALLAX_IMAGES = true
const SHOW_TILE_IMAGES = true
const SHOW_SUPPORT_BACKDROP_IMAGES = true
const SHOW_SUPPORT_FOREGROUND_CAPS = false
const SHOW_SUPPORT_FOREGROUND_INTERNAL_CAVES = true
const SHOW_OBJECT_AVAILABILITY_DEBUG = false
const CONTINUOUS_SCROLL_TEST_MODE = false
const MANUAL_CAMERA_SCROLL_MODE = true
const FALL_RECOVERY_BUFFER_TILES = 4
const CONTINUOUS_SCROLL_SPEED_PX = 180
const MANUAL_CAMERA_SCROLL_SPEED_PX = 420
const OBJECT_MIN_DEPTH = 5
const INTERNAL_DEBUG_TILE_VALUE = 8
const SEPARATOR_DEBUG_TILE_VALUE = 1

interface TileStats {
  empty: number
  ground: number
  platform: number
  support: number
}

type RunnerBody = Phaser.Physics.Arcade.Body
type RunnerSprite = Phaser.GameObjects.Rectangle & { body: RunnerBody }

interface ChunkDebugOverlay {
  gridGraphics: Phaser.GameObjects.Graphics
  fillGraphics: Phaser.GameObjects.Graphics
  labels: Phaser.GameObjects.Text[]
}

export default class GameScene extends Phaser.Scene {
  private chunkManager!: ChunkManager
  private player!: RunnerSprite
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private keyA!: Phaser.Input.Keyboard.Key
  private keyD!: Phaser.Input.Keyboard.Key
  private parallaxManager: ParallaxBackgroundManager | null = null
  private debugKey!: Phaser.Input.Keyboard.Key
  private lightingDebugKey!: Phaser.Input.Keyboard.Key
  private readonly debugChunkOverlays = new Map<number, ChunkDebugOverlay>()
  private runtimeHudText: Phaser.GameObjects.Text | null = null
  private lightingOverlay: FullScreenGradientOverlayHandle | null = null
  private debugEnabled = false
  private runtimeTileSizePx = TILE_SIZE_PX
  private runtimeTileScale = 1
  private runtimeChunkWidthPx = GRID_WIDTH * TILE_SIZE_PX
  private runtimeChunkHeightPx = GRID_HEIGHT * TILE_SIZE_PX
  private playerStartX = PLAYER_START_X
  /** Pixel Y where the WFC tilemap chunk starts — fills from here to screen bottom */
  private chunkOffsetY = 0
  private nextChunkTriggerX = GRID_WIDTH * TILE_SIZE_PX * 0.5
  private maxWorldRightEdge = GRID_WIDTH * TILE_SIZE_PX
  private hasPlacedSpawn = false
  private cachedCollisionTileIndices: number[] | null = null
  private readonly chunkTileStatsCache: WeakMap<Chunk, TileStats> =
    new WeakMap()
  private lastRuntimeHudUpdateMs = 0
  private lastAttachDurationMs = 0
  private averageAttachDurationMs = 0
  private attachedChunkCount = 0

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
    this.load.atlas(
      RUNNER_ASSET_KEYS.OBJECTS_ATLAS,
      'assets/objects.png',
      'assets/objects.json'
    )
  }

  public create(): void {
    const sw = this.scale.width
    const sh = this.scale.height

    this.runtimeTileSizePx = sh / GRID_HEIGHT
    this.runtimeTileScale = this.runtimeTileSizePx / TILE_SIZE_PX
    this.runtimeChunkWidthPx = GRID_WIDTH * this.runtimeTileSizePx
    this.runtimeChunkHeightPx = GRID_HEIGHT * this.runtimeTileSizePx
    this.playerStartX = this.runtimeTileSizePx * 6

    // How many pixels of sky sit above the tile grid
    this.chunkOffsetY = Math.max(0, sh - this.runtimeChunkHeightPx)
    this.nextChunkTriggerX = this.runtimeChunkWidthPx * 0.5
    this.maxWorldRightEdge = this.runtimeChunkWidthPx

    this.cameras.main.setBackgroundColor(INFINITE_RUNNER_COLORS.base)
    const keyboard = this.input.keyboard

    if (!keyboard) {
      throw new Error('Keyboard input is unavailable in GameScene')
    }

    this.cursors = keyboard.createCursorKeys()
    this.keyA = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this.keyD = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.A,
      Phaser.Input.Keyboard.KeyCodes.D,
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    ])
    this.debugKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.G)
    this.lightingDebugKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L)

    // Optional visual layer while tuning randomization rules.
    if (SHOW_PARALLAX_IMAGES) {
      this.parallaxManager = new ParallaxBackgroundManager(this, sw, sh)
    }

    this.lightingOverlay = createFullScreenGradientOverlay(this, sw, sh)

    const playerShape = this.add.rectangle(
      this.playerStartX,
      this.chunkOffsetY + this.runtimeTileSizePx * 4,
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
    this.physics.world.setBounds(
      0,
      0,
      this.runtimeChunkWidthPx * (1 + WORLD_PADDING_CHUNKS),
      sh + this.runtimeTileSizePx * 4
    )
    // Camera bounds: no vertical scroll — full height is always visible
    this.cameras.main.setBounds(
      0,
      0,
      this.runtimeChunkWidthPx * (1 + WORLD_PADDING_CHUNKS),
      sh
    )
    this.cameras.main.roundPixels = true

    // HUD (fixed to camera)
    this.add
      .text(
        12,
        12,
        'Arrows or A/D = Scroll  |  SPACE = Jump  |  G = Grid  |  L = Gradient Guide',
        {
          fontSize: '12px',
          color: '#ffffff',
        }
      )
      .setAlpha(0.6)
      .setScrollFactor(0)
      .setDepth(1100)

    this.runtimeHudText = this.add
      .text(12, 30, '', {
        fontSize: '11px',
        color: '#dce6ff',
        backgroundColor: '#1d2f43',
        padding: { x: 6, y: 4 },
      })
      .setAlpha(0.9)
      .setScrollFactor(0)
      .setDepth(1101)

    this.chunkManager = new ChunkManager((chunk, lifecycle) => {
      this.attachChunk(chunk, lifecycle)
    })

    this.events.once('shutdown', () => {
      this.chunkManager.destroy()
      this.parallaxManager?.destroy()
      this.parallaxManager = null
      this.clearDebugOverlay()
      this.lightingOverlay?.destroy()
      this.lightingOverlay = null
      this.runtimeHudText?.destroy()
      this.runtimeHudText = null
    })
  }

  public update(): void {
    this.handleLightingOverlayDebugToggle()
    this.updateRuntimeHud()
    this.handleDebugToggle()

    if (!this.hasPlacedSpawn) {
      return
    }

    this.updatePlayerMovement()

    if (
      !MANUAL_CAMERA_SCROLL_MODE &&
      Phaser.Input.Keyboard.JustDown(this.cursors.space ?? null) &&
      this.player.body.blocked.down
    ) {
      this.player.body.setVelocityY(PLAYER_JUMP_VELOCITY)
    }

    this.updateChunkStreaming()
    this.syncDebugOverlayWithActiveChunks()

    if (
      !MANUAL_CAMERA_SCROLL_MODE &&
      this.player.y >
        this.scale.height + this.runtimeTileSizePx * FALL_RECOVERY_BUFFER_TILES
    ) {
      this.recoverPlayerForGenerationTest()
    }
  }

  private handleLightingOverlayDebugToggle(): void {
    if (
      this.lightingOverlay &&
      Phaser.Input.Keyboard.JustDown(this.lightingDebugKey)
    ) {
      this.lightingOverlay.setDebugGuideVisible(
        !this.lightingOverlay.isDebugGuideVisible()
      )
    }
  }

  private updatePlayerMovement(): void {
    const body = this.player.body
    const wantsLeft = (this.cursors.left?.isDown ?? false) || this.keyA.isDown
    const wantsRight = (this.cursors.right?.isDown ?? false) || this.keyD.isDown

    if (MANUAL_CAMERA_SCROLL_MODE) {
      body.setVelocityX(0)
      this.updateManualCameraScroll(wantsLeft, wantsRight)
      return
    }

    if (CONTINUOUS_SCROLL_TEST_MODE) {
      body.setVelocityX(0)
      this.updateContinuousCameraScroll()
      return
    }

    if (wantsRight && !wantsLeft) {
      body.setVelocityX(PLAYER_RUN_SPEED)
      return
    }

    if (wantsLeft && !wantsRight) {
      body.setVelocityX(-PLAYER_RUN_SPEED)
      return
    }

    body.setVelocityX(0)
  }

  private updateManualCameraScroll(
    wantsLeft: boolean,
    wantsRight: boolean
  ): void {
    const deltaSeconds = this.game.loop.delta / 1000
    const scrollDirection = (wantsRight ? 1 : 0) - (wantsLeft ? 1 : 0)
    const nextScrollX =
      this.cameras.main.scrollX +
      scrollDirection * MANUAL_CAMERA_SCROLL_SPEED_PX * deltaSeconds
    const maxCameraX = Math.max(
      0,
      this.physics.world.bounds.width - this.scale.width
    )

    this.cameras.main.setScroll(
      Phaser.Math.Clamp(nextScrollX, 0, maxCameraX),
      0
    )
  }

  private updateContinuousCameraScroll(): void {
    const deltaSeconds = this.game.loop.delta / 1000
    const nextScrollX =
      this.cameras.main.scrollX + CONTINUOUS_SCROLL_SPEED_PX * deltaSeconds

    this.cameras.main.setScroll(nextScrollX, 0)
  }

  private updateChunkStreaming(): void {
    const cameraScrollX = this.cameras.main.scrollX
    this.parallaxManager?.update(cameraScrollX)
    const cleanupBoundaryX = Math.max(
      0,
      cameraScrollX - this.runtimeChunkWidthPx * CHUNK_CLEANUP_BEHIND
    )
    this.chunkManager.destroyStaleChunks(cleanupBoundaryX)

    const triggerX = Math.max(
      this.player.x,
      cameraScrollX + this.scale.width * CHUNK_TRIGGER_AHEAD_RATIO
    )

    if (triggerX <= this.nextChunkTriggerX) {
      this.proactivelyRequestChunks(cameraScrollX)
      return
    }

    this.chunkManager.triggerNextChunk()
    this.nextChunkTriggerX += this.runtimeChunkWidthPx
    this.preExtendWorldBounds(this.nextChunkTriggerX + this.runtimeChunkWidthPx)
    this.proactivelyRequestChunks(cameraScrollX)
  }

  private proactivelyRequestChunks(cameraScrollX: number): void {
    const currentChunkIndex = Math.floor(
      cameraScrollX / this.runtimeChunkWidthPx
    )
    const desiredLastChunkIndex = currentChunkIndex + CHUNK_PREFETCH_AHEAD

    const diagnostics = this.chunkManager.getDiagnostics()
    const activeChunks = this.chunkManager.getActiveChunksSnapshot()
    let lastActiveChunk: ActiveChunk | undefined
    for (const activeChunk of activeChunks) {
      lastActiveChunk = activeChunk
    }
    const lastActiveChunkIndex = lastActiveChunk?.lifecycle.chunkIndex ?? -1

    const scheduledThroughChunkIndex =
      diagnostics.generating || diagnostics.pendingRequests > 0
        ? diagnostics.nextChunkIndex + diagnostics.pendingRequests
        : diagnostics.nextChunkIndex - 1

    const coveredThroughChunkIndex = Math.max(
      lastActiveChunkIndex,
      scheduledThroughChunkIndex
    )
    const missingChunkCount = Math.max(
      0,
      desiredLastChunkIndex - coveredThroughChunkIndex
    )

    for (let i = 0; i < missingChunkCount; i += 1) {
      this.chunkManager.triggerNextChunk()
    }

    if (missingChunkCount > 0) {
      this.preExtendWorldBounds(
        (desiredLastChunkIndex + 1) * this.runtimeChunkWidthPx
      )
    }
  }

  private handleDebugToggle(): void {
    if (!Phaser.Input.Keyboard.JustDown(this.debugKey)) {
      return
    }

    this.debugEnabled = !this.debugEnabled

    if (this.debugEnabled) {
      this.redrawDebugOverlay()
      return
    }

    this.clearDebugOverlay()
  }

  private recoverPlayerForGenerationTest(): void {
    const body = this.player.body
    const fallbackX = Math.max(
      this.player.x,
      this.cameras.main.scrollX + this.scale.width * 0.35
    )
    const fallbackY = this.chunkOffsetY + this.runtimeTileSizePx * 2

    body.reset(fallbackX, fallbackY)
    body.setVelocityX(PLAYER_RUN_SPEED)
    body.setVelocityY(0)
  }

  private attachChunk(chunk: Chunk, lifecycle: ChunkLifecycle): void {
    const attachStart = performance.now()
    const chunkGroundStyleByColumn = chunk.groundTopStyleByColumn
    const collisionTilemapData =
      chunk.collisionTilemapData ??
      chunk.tiles.map((row, rowIndex) =>
        row.map((_, colIndex) =>
          getRenderFrameForTileAt(chunk.tiles, rowIndex, colIndex, {
            groundStyleByColumn: chunkGroundStyleByColumn,
          })
        )
      )

    const supportVisualTilemapData = SHOW_SUPPORT_BACKDROP_IMAGES
      ? (chunk.supportVisualTilemapData ??
        this.buildSupportVisualTilemapDataFallback(chunk))
      : null

    const supportForegroundTilemapData =
      SHOW_SUPPORT_FOREGROUND_CAPS || SHOW_SUPPORT_FOREGROUND_INTERNAL_CAVES
        ? (chunk.supportForegroundTilemapData ??
          this.buildSupportForegroundTilemapDataFallback(chunk))
        : null

    const tilemap = this.make.tilemap({
      data: collisionTilemapData,
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

    const supportVisualTilemap = supportVisualTilemapData
      ? this.make.tilemap({
          data: supportVisualTilemapData,
          tileWidth: TILE_SIZE_PX,
          tileHeight: TILE_SIZE_PX,
        })
      : null
    const supportVisualTileset = supportVisualTilemap
      ? supportVisualTilemap.addTilesetImage(
          TILESET_KEY,
          TILESET_KEY,
          TILE_SIZE_PX,
          TILE_SIZE_PX,
          0,
          0
        )
      : null

    if (supportVisualTilemap && !supportVisualTileset) {
      throw new Error(
        `Unable to create support visual tileset using texture key ${TILESET_KEY}`
      )
    }

    const supportForegroundTilemap = supportForegroundTilemapData
      ? this.make.tilemap({
          data: supportForegroundTilemapData,
          tileWidth: TILE_SIZE_PX,
          tileHeight: TILE_SIZE_PX,
        })
      : null
    const supportForegroundTileset = supportForegroundTilemap
      ? supportForegroundTilemap.addTilesetImage(
          TILESET_KEY,
          TILESET_KEY,
          TILE_SIZE_PX,
          TILE_SIZE_PX,
          0,
          0
        )
      : null

    if (supportForegroundTilemap && !supportForegroundTileset) {
      throw new Error(
        `Unable to create support foreground tileset using texture key ${TILESET_KEY}`
      )
    }

    const layer = tilemap.createLayer(
      0,
      tileset,
      lifecycle.chunkIndex * this.runtimeChunkWidthPx,
      this.chunkOffsetY
    )

    if (!layer) {
      throw new Error(
        `Unable to create tilemap layer for chunk ${lifecycle.chunkIndex}`
      )
    }

    const supportVisualLayer =
      supportVisualTilemap && supportVisualTileset
        ? supportVisualTilemap.createLayer(
            0,
            supportVisualTileset,
            lifecycle.chunkIndex * this.runtimeChunkWidthPx,
            this.chunkOffsetY
          )
        : null

    const supportForegroundLayer =
      supportForegroundTilemap && supportForegroundTileset
        ? supportForegroundTilemap.createLayer(
            0,
            supportForegroundTileset,
            lifecycle.chunkIndex * this.runtimeChunkWidthPx,
            this.chunkOffsetY
          )
        : null

    layer.setDepth(1)
    layer.setScale(this.runtimeTileScale)
    layer.setCollision(this.getCollisionTileIndices())
    layer.setVisible(SHOW_TILE_IMAGES)

    if (supportVisualLayer) {
      supportVisualLayer.setDepth(0)
      supportVisualLayer.setScale(this.runtimeTileScale)
      supportVisualLayer.setVisible(SHOW_TILE_IMAGES)
    }

    if (supportForegroundLayer) {
      supportForegroundLayer.setDepth(2)
      supportForegroundLayer.setScale(this.runtimeTileScale)
      supportForegroundLayer.setVisible(SHOW_TILE_IMAGES)
    }

    const chunkRightEdgePx =
      (lifecycle.chunkIndex + 1) * this.runtimeChunkWidthPx
    const objectAvailabilityOverlay = SHOW_OBJECT_AVAILABILITY_DEBUG
      ? this.drawObjectAvailabilityOverlay(
          chunk,
          lifecycle.chunkIndex * this.runtimeChunkWidthPx
        )
      : null
    const objectSprites = this.drawChunkObjects(
      chunk,
      lifecycle.chunkIndex * this.runtimeChunkWidthPx
    )

    const collider = this.physics.add.collider(this.player, layer)
    const activeChunk: ActiveChunk = {
      chunk,
      tilemap,
      layer,
      visualTilemap: supportVisualTilemap ?? undefined,
      visualLayer: supportVisualLayer ?? undefined,
      foregroundVisualTilemap: supportForegroundTilemap ?? undefined,
      foregroundVisualLayer: supportForegroundLayer ?? undefined,
      objectAvailabilityOverlay: objectAvailabilityOverlay ?? undefined,
      objectSprites,
      collider,
      lifecycle,
      rightEdgePx: chunkRightEdgePx,
    }

    this.chunkManager.registerActiveChunk(activeChunk)
    this.refreshSeamFrames(lifecycle.chunkIndex)
    this.updateWorldBounds(chunkRightEdgePx)
    if (this.debugEnabled) {
      this.drawDebugChunkOverlayForChunk(activeChunk)
    }

    if (!this.hasPlacedSpawn) {
      this.placePlayerSpawn(chunk)
    }

    if (lifecycle.chunkIndex + 1 > MAX_ACTIVE_CHUNKS) {
      console.debug(
        `Chunk ${lifecycle.chunkIndex} attached; cleanup should keep active chunks near ${MAX_ACTIVE_CHUNKS}`
      )
    }

    const attachDurationMs = performance.now() - attachStart
    this.lastAttachDurationMs = attachDurationMs
    this.attachedChunkCount += 1
    const priorTotal =
      this.averageAttachDurationMs * (this.attachedChunkCount - 1)
    this.averageAttachDurationMs =
      (priorTotal + attachDurationMs) / this.attachedChunkCount
  }

  private shouldRenderSupportForegroundCap(
    chunk: Chunk,
    row: number,
    col: number,
    supportTile: Tile
  ): boolean {
    if (supportTile !== Tile.CAVE) {
      return false
    }

    const terrainTile = chunk.tiles[row][col]
    if (terrainTile === Tile.EMPTY) {
      return false
    }

    if (row === 0) {
      return true
    }

    return chunk.tiles[row - 1][col] === Tile.EMPTY
  }

  private buildSupportForegroundTilemapDataFallback(chunk: Chunk): number[][] {
    return chunk.supportTiles.map((row, rowIndex) =>
      row.map((tile, colIndex) => {
        if (
          !this.shouldRenderSupportForegroundCap(
            chunk,
            rowIndex,
            colIndex,
            tile
          )
        ) {
          return TILE_RENDER_INDEX[Tile.EMPTY]
        }

        return resolveCaveCapTopEdgeFrame(
          chunk.supportTiles as number[][],
          rowIndex,
          colIndex
        )
      })
    )
  }

  private buildSupportVisualTilemapDataFallback(chunk: Chunk): number[][] {
    const supportBackdropTiles = chunk.supportTiles.map((row) => [...row])

    const emptyFrame = TILE_RENDER_INDEX[Tile.EMPTY]
    const caveFrame = TILE_RENDER_INDEX[Tile.CAVE]

    return supportBackdropTiles.map((row, rowIndex) =>
      row.map((tile, colIndex) => {
        if (tile !== Tile.CAVE) return emptyFrame
        const resolved = getRenderFrameForTileAt(
          supportBackdropTiles,
          rowIndex,
          colIndex
        )
        return resolved === emptyFrame ? caveFrame : resolved
      })
    )
  }

  private refreshSeamFrames(chunkIndex: number): void {
    const activeChunks = this.chunkManager.getActiveChunksSnapshot()
    let previousChunk: ActiveChunk | null = null
    let currentChunk: ActiveChunk | null = null

    for (const activeChunk of activeChunks) {
      if (activeChunk.lifecycle.chunkIndex === chunkIndex - 1) {
        previousChunk = activeChunk
      }

      if (activeChunk.lifecycle.chunkIndex === chunkIndex) {
        currentChunk = activeChunk
      }
    }

    if (!currentChunk) {
      return
    }

    if (previousChunk) {
      const previousRightStyle =
        previousChunk.chunk.groundTopStyleByColumn?.[GRID_WIDTH - 1] ?? null
      const currentLeftStyle =
        currentChunk.chunk.groundTopStyleByColumn?.[0] ?? null

      this.refreshChunkEdgeFrames(
        previousChunk,
        GRID_WIDTH - 1,
        null,
        currentChunk.chunk.tiles.map((row) => row[0]),
        null,
        currentLeftStyle,
        {
          right: currentChunk.chunk.supportTiles.map((row) => row[0]),
        }
      )

      this.refreshChunkEdgeFrames(
        currentChunk,
        0,
        previousChunk.chunk.tiles.map((row) => row[GRID_WIDTH - 1]),
        null,
        previousRightStyle,
        null,
        {
          left: previousChunk.chunk.supportTiles.map(
            (row) => row[GRID_WIDTH - 1]
          ),
        }
      )
      return
    }

    this.refreshChunkEdgeFrames(currentChunk, 0, null, null)
  }

  private refreshChunkEdgeFrames(
    activeChunk: ActiveChunk,
    column: number,
    leftNeighborColumn: Tile[] | null,
    rightNeighborColumn: Tile[] | null,
    leftNeighborGroundStyle: number | null = null,
    rightNeighborGroundStyle: number | null = null,
    supportNeighbors?: {
      left?: Tile[] | null
      right?: Tile[] | null
    }
  ): void {
    const paddedTiles = activeChunk.chunk.tiles.map((row, rowIndex) => [
      leftNeighborColumn?.[rowIndex] ?? Tile.EMPTY,
      ...row,
      rightNeighborColumn?.[rowIndex] ?? Tile.EMPTY,
    ])

    const chunkGroundStyleByColumn = activeChunk.chunk.groundTopStyleByColumn
    const paddedGroundStyleByColumn = [
      leftNeighborGroundStyle ?? -1,
      ...(chunkGroundStyleByColumn ??
        Array.from({ length: GRID_WIDTH }, () => -1)),
      rightNeighborGroundStyle ?? -1,
    ]

    const paddedColumn = column + 1
    const styleMinCol = 1
    const styleMaxCol = paddedTiles[0].length - 2

    const supportPaddedTiles = activeChunk.chunk.supportTiles.map(
      (supportRow, supportRowIndex) => [
        supportNeighbors?.left?.[supportRowIndex] ?? Tile.EMPTY,
        ...supportRow,
        supportNeighbors?.right?.[supportRowIndex] ?? Tile.EMPTY,
      ]
    )

    for (let row = 0; row < GRID_HEIGHT; row += 1) {
      const frame = getRenderFrameForTileAt(paddedTiles, row, paddedColumn, {
        groundStyleBounds: {
          minCol: styleMinCol,
          maxCol: styleMaxCol,
        },
        groundStyleByColumn: paddedGroundStyleByColumn,
      })
      activeChunk.layer.putTileAt(frame, column, row, true)

      if (!activeChunk.visualLayer) {
        continue
      }

      const supportFrame = getRenderFrameForTileAt(
        supportPaddedTiles,
        row,
        paddedColumn
      )

      const supportIsCave =
        activeChunk.chunk.supportTiles[row][column] === Tile.CAVE
      let finalSupportFrame = TILE_RENDER_INDEX[Tile.EMPTY]
      if (supportIsCave) {
        finalSupportFrame = supportFrame
        if (supportFrame === TILE_RENDER_INDEX[Tile.EMPTY]) {
          finalSupportFrame = TILE_RENDER_INDEX[Tile.CAVE]
        }
      }

      activeChunk.visualLayer.putTileAt(finalSupportFrame, column, row, true)
    }
  }

  private placePlayerSpawn(chunk: Chunk): void {
    const spawnColumn = 6
    const groundY = this.findSpawnGroundY(chunk, spawnColumn)
    const body = this.player.body

    this.player.setPosition(this.playerStartX, groundY)
    body.reset(this.playerStartX, groundY)
    body.setAllowGravity(
      !CONTINUOUS_SCROLL_TEST_MODE && !MANUAL_CAMERA_SCROLL_MODE
    )
    this.hasPlacedSpawn = true

    if (!CONTINUOUS_SCROLL_TEST_MODE && !MANUAL_CAMERA_SCROLL_MODE) {
      this.cameras.main.startFollow(this.player, true, 0.12, 0.12, -220, 0)
      return
    }

    this.cameras.main.stopFollow()
    this.player.setVisible(false)
    body.setVelocity(0, 0)
  }

  private findSpawnGroundY(chunk: Chunk, column: number): number {
    for (let row = 0; row < GRID_HEIGHT; row++) {
      const tile = chunk.tiles[row][column]

      if (tile !== Tile.GROUND) {
        continue
      }

      return this.chunkOffsetY + row * this.runtimeTileSizePx - 2
    }

    return (
      this.chunkOffsetY + this.runtimeChunkHeightPx - this.runtimeTileSizePx * 2
    )
  }

  private updateWorldBounds(rightEdgePx: number): void {
    this.maxWorldRightEdge = Math.max(this.maxWorldRightEdge, rightEdgePx)
    const worldWidth =
      this.maxWorldRightEdge + this.runtimeChunkWidthPx * WORLD_PADDING_CHUNKS
    const sh = this.scale.height
    this.physics.world.setBounds(
      0,
      0,
      worldWidth,
      sh + this.runtimeTileSizePx * 4
    )
    this.cameras.main.setBounds(0, 0, worldWidth, sh)
  }

  /** Optimistically widen bounds so the camera can scroll while the worker
   *  is still generating the next incoming chunk. */
  private preExtendWorldBounds(estimatedRightEdge: number): void {
    const worldWidth =
      estimatedRightEdge + this.runtimeChunkWidthPx * WORLD_PADDING_CHUNKS
    const sh = this.scale.height
    this.physics.world.setBounds(
      0,
      0,
      worldWidth,
      sh + this.runtimeTileSizePx * 4
    )
    this.cameras.main.setBounds(0, 0, worldWidth, sh)
  }

  private getCollisionTileIndices(): number[] {
    if (this.cachedCollisionTileIndices) {
      return this.cachedCollisionTileIndices
    }

    const collisionTileIndices = new Set<number>()

    for (const tile of COLLIDABLE_TILES) {
      for (const frameIndex of getCollisionFrameIndicesForTile(tile)) {
        if (frameIndex >= 0) {
          collisionTileIndices.add(frameIndex)
        }
      }
    }

    this.cachedCollisionTileIndices = Array.from(collisionTileIndices)
    return this.cachedCollisionTileIndices
  }

  private redrawDebugOverlay(): void {
    this.clearDebugOverlay()
    this.syncDebugOverlayWithActiveChunks()
  }

  /**
   * Draw a world-space square grid aligned to each active chunk (20x60).
   * Because this uses world coordinates, it follows generated elements while scrolling.
   */
  private syncDebugOverlayWithActiveChunks(): void {
    if (!this.debugEnabled) {
      return
    }

    const activeChunks = this.chunkManager.getActiveChunksSnapshot()
    const activeChunkIndices = new Set<number>()

    for (const activeChunk of activeChunks) {
      const chunkIndex = activeChunk.lifecycle.chunkIndex
      activeChunkIndices.add(chunkIndex)

      if (this.debugChunkOverlays.has(chunkIndex)) {
        continue
      }

      this.drawDebugChunkOverlayForChunk(activeChunk)
    }

    for (const [chunkIndex] of this.debugChunkOverlays) {
      if (activeChunkIndices.has(chunkIndex)) {
        continue
      }

      this.destroyDebugChunkOverlay(chunkIndex)
    }
  }

  private drawDebugChunkOverlayForChunk(activeChunk: ActiveChunk): void {
    const chunkIndex = activeChunk.lifecycle.chunkIndex
    if (this.debugChunkOverlays.has(chunkIndex)) {
      return
    }

    const cellSize = this.runtimeTileSizePx
    const gridWidth = cellSize * DEBUG_GRID_COLUMNS
    const gridHeight = cellSize * DEBUG_GRID_ROWS
    const fontSizePx = Math.max(
      DEBUG_GRID_STYLE.labelMinFontSizePx,
      Math.round(cellSize * DEBUG_GRID_STYLE.labelFontSizeFactor)
    )
    const xOffset = chunkIndex * this.runtimeChunkWidthPx
    const yOffset = this.chunkOffsetY

    const gridGraphics = this.add.graphics().setDepth(100)
    const fillGraphics = this.add.graphics().setDepth(0.5)
    const labels: Phaser.GameObjects.Text[] = []

    gridGraphics.lineStyle(
      1,
      DEBUG_GRID_STYLE.lineColor,
      DEBUG_GRID_STYLE.lineAlpha
    )

    this.drawChunkGridLines(
      gridGraphics,
      xOffset,
      yOffset,
      cellSize,
      gridWidth,
      gridHeight
    )
    this.drawChunkTileValues(
      activeChunk,
      fillGraphics,
      labels,
      xOffset,
      yOffset,
      cellSize,
      fontSizePx
    )

    this.debugChunkOverlays.set(chunkIndex, {
      gridGraphics,
      fillGraphics,
      labels,
    })
  }

  private destroyDebugChunkOverlay(chunkIndex: number): void {
    const overlay = this.debugChunkOverlays.get(chunkIndex)
    if (!overlay) {
      return
    }

    overlay.gridGraphics.destroy()
    overlay.fillGraphics.destroy()
    for (const label of overlay.labels) {
      label.destroy()
    }

    this.debugChunkOverlays.delete(chunkIndex)
  }

  private drawChunkGridLines(
    gridGraphics: Phaser.GameObjects.Graphics,
    xOffset: number,
    yOffset: number,
    cellSize: number,
    gridWidth: number,
    gridHeight: number
  ): void {
    for (let row = 0; row <= DEBUG_GRID_ROWS; row += 1) {
      const y = Math.round(yOffset + row * cellSize) + 0.5
      gridGraphics.beginPath()
      gridGraphics.moveTo(xOffset + 0.5, y)
      gridGraphics.lineTo(xOffset + gridWidth + 0.5, y)
      gridGraphics.strokePath()
    }

    for (let col = 0; col <= DEBUG_GRID_COLUMNS; col += 1) {
      const x = Math.round(xOffset + col * cellSize) + 0.5
      gridGraphics.beginPath()
      gridGraphics.moveTo(x, yOffset + 0.5)
      gridGraphics.lineTo(x, yOffset + gridHeight + 0.5)
      gridGraphics.strokePath()
    }
  }

  private drawObjectAvailabilityOverlay(
    chunk: Chunk,
    chunkOffsetX: number
  ): Phaser.GameObjects.Graphics {
    const graphics = this.add.graphics().setDepth(3)
    const availabilityGrid = chunk.objectAvailabilityGrid

    if (!availabilityGrid) {
      return graphics
    }

    graphics.fillStyle(0xff9f1c, 0.55)

    for (let row = 0; row < availabilityGrid.length; row += 1) {
      for (let col = 0; col < availabilityGrid[row].length; col += 1) {
        const availabilitySlots = availabilityGrid[row][col]
        if (availabilitySlots < OBJECT_AVAILABILITY_OPEN) {
          continue
        }

        const fillAlpha = Math.min(0.85, 0.35 + availabilitySlots * 0.12)
        graphics.fillStyle(0xff9f1c, fillAlpha)

        graphics.fillRect(
          chunkOffsetX + col * this.runtimeTileSizePx,
          this.chunkOffsetY + row * this.runtimeTileSizePx,
          this.runtimeTileSizePx,
          this.runtimeTileSizePx
        )
      }
    }

    return graphics
  }

  private drawChunkObjects(
    chunk: Chunk,
    chunkOffsetX: number
  ): (Phaser.GameObjects.Image | Phaser.GameObjects.Sprite)[] {
    const placements = chunk.objectPlacements ?? []
    const created: (Phaser.GameObjects.Image | Phaser.GameObjects.Sprite)[] = []

    for (const placement of placements) {
      try {
        const depth = Math.max(placement.renderDepth ?? 4, OBJECT_MIN_DEPTH)
        const yOffsetPx =
          placement.renderYOffsetPx ??
          (placement.frameKey.startsWith('64x96/') ? 1 : 0)
        if (placement.animationKey) {
          this.ensureAnimationExists(placement.animationKey)
          const sprite = this.add
            .sprite(
              chunkOffsetX + placement.col * this.runtimeTileSizePx,
              this.chunkOffsetY +
                placement.row * this.runtimeTileSizePx +
                yOffsetPx,
              RUNNER_ASSET_KEYS.OBJECTS_ATLAS,
              placement.frameKey
            )
            .setOrigin(0, 0)
            .setScale(this.runtimeTileScale)
            .setDepth(depth)

          if (sprite && typeof sprite.play === 'function') {
            sprite.play(placement.animationKey)
          }
          created.push(sprite)
        } else {
          const image = this.add
            .image(
              chunkOffsetX + placement.col * this.runtimeTileSizePx,
              this.chunkOffsetY +
                placement.row * this.runtimeTileSizePx +
                yOffsetPx,
              RUNNER_ASSET_KEYS.OBJECTS_ATLAS,
              placement.frameKey
            )
            .setOrigin(0, 0)
            .setScale(this.runtimeTileScale)
            .setDepth(depth)

          created.push(image)
        }
      } catch (error) {
        console.error('Error creating object sprite:', error, placement)
      }
    }

    return created
  }

  private ensureAnimationExists(animationKey: string): void {
    if (this.anims.exists(animationKey)) {
      return
    }
  }

  private drawChunkTileValues(
    activeChunk: ActiveChunk,
    fillGraphics: Phaser.GameObjects.Graphics,
    labels: Phaser.GameObjects.Text[],
    xOffset: number,
    yOffset: number,
    cellSize: number,
    fontSizePx: number
  ): void {
    const chunk = activeChunk.chunk

    for (let row = 0; row < GRID_HEIGHT; row += 1) {
      for (let col = 0; col < GRID_WIDTH; col += 1) {
        const tile = chunk.tiles[row][col]
        const resolvedFrame =
          activeChunk.layer.getTileAt(col, row, true)?.index ??
          TILE_RENDER_INDEX[Tile.EMPTY]
        const isUnresolvedTile =
          tile !== Tile.EMPTY && resolvedFrame === TILE_RENDER_INDEX[Tile.EMPTY]

        // Support tiles that have no authored rule also need the blue debug cell.
        const supportTile = chunk.supportTiles[row][col]
        const supportResolved =
          activeChunk.visualLayer?.getTileAt(col, row, true)?.index ??
          TILE_RENDER_INDEX[Tile.EMPTY]
        const isUnresolvedSupport =
          supportTile === Tile.CAVE &&
          (supportResolved === TILE_RENDER_INDEX[Tile.EMPTY] ||
            supportResolved === TILE_RENDER_INDEX[Tile.CAVE])

        const effectiveTile =
          tile !== Tile.EMPTY ? tile : isUnresolvedSupport ? Tile.CAVE : tile
        const effectiveUnresolved =
          tile !== Tile.EMPTY ? isUnresolvedTile : isUnresolvedSupport
        const isInternalDebugCell = isGroundInternalDebugCell(
          chunk.tiles,
          row,
          col,
          GROUND_INTERNAL_DEBUG_OFFSET_TILES
        )
        const isSeparatorDebugCell =
          !isInternalDebugCell &&
          tile === Tile.GROUND &&
          isGroundSeparatorCell(chunk.tiles, row, col)
        const labelText = this.getDebugLabelText(
          effectiveTile,
          effectiveUnresolved,
          isInternalDebugCell,
          isSeparatorDebugCell
        )

        this.drawDebugCellFill(
          fillGraphics,
          effectiveTile,
          effectiveUnresolved,
          isInternalDebugCell,
          xOffset + col * cellSize,
          yOffset + row * cellSize,
          cellSize
        )

        if (SHOW_DEBUG_LABELS && labelText !== '') {
          const label = this.add
            .text(
              xOffset + col * cellSize + cellSize * 0.5,
              yOffset + row * cellSize + cellSize * 0.5,
              labelText,
              {
                fontSize: `${fontSizePx}px`,
                color: DEBUG_GRID_STYLE.labelColor,
                align: 'center',
                resolution: 2,
              }
            )
            .setDepth(101)

          label.setOrigin(0.5, 0.5)
          label.setAlpha(DEBUG_GRID_STYLE.labelAlpha)
          labels.push(label)
        }
      }
    }
  }

  private getDebugLabelText(
    tile: Tile,
    isUnresolvedTile: boolean,
    isInternalDebugCell: boolean,
    isSeparatorDebugCell: boolean
  ): string {
    if (isInternalDebugCell) {
      return String(INTERNAL_DEBUG_TILE_VALUE)
    }

    if (isSeparatorDebugCell) {
      return String(SEPARATOR_DEBUG_TILE_VALUE)
    }

    if (tile === Tile.EMPTY) {
      return SHOW_EMPTY_DEBUG_LABELS ? '-1' : ''
    }

    return isUnresolvedTile ? String(tile) : ''
  }

  private drawDebugCellFill(
    fillGraphics: Phaser.GameObjects.Graphics,
    tile: Tile,
    isUnresolvedTile: boolean,
    isInternalDebugCell: boolean,
    x: number,
    y: number,
    cellSize: number
  ): void {
    if (isInternalDebugCell) {
      this.fillDebugCell(
        fillGraphics,
        DEBUG_GRID_STYLE.internalCellColor,
        DEBUG_GRID_STYLE.internalCellAlpha,
        x,
        y,
        cellSize
      )
      return
    }

    if (!isUnresolvedTile) {
      return
    }

    if (tile === Tile.GROUND) {
      this.fillDebugCell(
        fillGraphics,
        DEBUG_GRID_STYLE.groundCellColor,
        DEBUG_GRID_STYLE.groundCellAlpha,
        x,
        y,
        cellSize
      )
      return
    }

    if (tile === Tile.PLATFORM) {
      this.fillDebugCell(
        fillGraphics,
        DEBUG_GRID_STYLE.platformCellColor,
        DEBUG_GRID_STYLE.platformCellAlpha,
        x,
        y,
        cellSize
      )
      return
    }

    if (tile === Tile.CAVE) {
      this.fillDebugCell(
        fillGraphics,
        DEBUG_GRID_STYLE.supportCellColor,
        DEBUG_GRID_STYLE.supportCellAlpha,
        x,
        y,
        cellSize
      )
    }
  }

  private fillDebugCell(
    fillGraphics: Phaser.GameObjects.Graphics,
    color: number,
    alpha: number,
    x: number,
    y: number,
    cellSize: number
  ): void {
    fillGraphics.fillStyle(color, alpha)
    fillGraphics.fillRect(x, y, cellSize, cellSize)
  }

  /** Remove all debug graphics. */
  private clearDebugOverlay(): void {
    for (const [chunkIndex] of this.debugChunkOverlays) {
      this.destroyDebugChunkOverlay(chunkIndex)
    }
  }

  /**
   * Runtime diagnostics for verifying camera motion, chunk flow and spawn state.
   * This text is intentionally compact so it can stay visible during gameplay.
   */
  private updateRuntimeHud(): void {
    if (!this.runtimeHudText) {
      return
    }

    const now = this.time.now
    if (now - this.lastRuntimeHudUpdateMs < RUNTIME_HUD_REFRESH_MS) {
      return
    }
    this.lastRuntimeHudUpdateMs = now

    const diagnostics = this.chunkManager.getDiagnostics()
    const chunks = this.chunkManager.getActiveChunksSnapshot()
    const tileStats = this.collectTileStats(chunks)
    const firstChunk = chunks[0]?.lifecycle.chunkIndex ?? '-'
    let lastActiveChunk: ActiveChunk | undefined
    for (const activeChunk of chunks) {
      lastActiveChunk = activeChunk
    }
    const lastChunk = lastActiveChunk?.lifecycle.chunkIndex ?? '-'
    const cameraX = Math.round(this.cameras.main.scrollX)
    const playerX = Math.round(this.player.x)
    const velocityX = Math.round(this.player.body.velocity.x)

    this.runtimeHudText.setText(
      this.buildRuntimeHudText({
        diagnostics,
        firstChunk,
        lastChunk,
        cameraX,
        playerX,
        velocityX,
        tileStats,
      })
    )
  }

  private collectTileStats(chunks: ActiveChunk[]): TileStats {
    const stats: TileStats = {
      empty: 0,
      ground: 0,
      platform: 0,
      support: 0,
    }

    for (const activeChunk of chunks) {
      let cached = this.chunkTileStatsCache?.get(activeChunk.chunk)
      if (!cached) {
        cached = { empty: 0, ground: 0, platform: 0, support: 0 }
        for (const row of activeChunk.chunk.tiles) {
          for (const tile of row) {
            if (tile === Tile.EMPTY) {
              cached.empty += 1
            } else if (tile === Tile.GROUND) {
              cached.ground += 1
            } else if (tile === Tile.PLATFORM) {
              cached.platform += 1
            }
          }
        }
        for (const row of activeChunk.chunk.supportTiles) {
          for (const tile of row) {
            if (tile === Tile.CAVE) {
              cached.support += 1
            }
          }
        }
        this.chunkTileStatsCache?.set(activeChunk.chunk, cached)
      }

      stats.empty += cached.empty
      stats.ground += cached.ground
      stats.platform += cached.platform
      stats.support += cached.support
    }

    return stats
  }

  private buildRuntimeHudText(args: {
    diagnostics: ChunkManagerDiagnostics
    firstChunk: number | '-'
    lastChunk: number | '-'
    cameraX: number
    playerX: number
    velocityX: number
    tileStats: TileStats
  }): string {
    const {
      diagnostics,
      firstChunk,
      lastChunk,
      cameraX,
      playerX,
      velocityX,
      tileStats,
    } = args

    return [
      `spawn=${this.hasPlacedSpawn ? 'yes' : 'no'}  debugTiles=${this.debugEnabled ? 'on' : 'off'}`,
      `playerX=${playerX}  vx=${velocityX}  camX=${cameraX}`,
      `chunks active=${diagnostics.activeChunkCount} [${firstChunk}..${lastChunk}] queued=${diagnostics.queuedChunkCount}`,
      `tileStats -1=${tileStats.empty} 5=${tileStats.platform} 6=${tileStats.ground} 7=${tileStats.support}`,
      `worker generating=${diagnostics.generating ? 'yes' : 'no'} pending=${diagnostics.pendingRequests} next=${diagnostics.nextChunkIndex}`,
      `worker lastChunk=${diagnostics.lastGeneratedChunkIndex ?? '-'} attempts=${diagnostics.lastAttemptCount} error=${diagnostics.lastWorkerError ?? 'none'}`,
      `worker gen last=${diagnostics.lastGenerationDurationMs.toFixed(1)}ms avg=${diagnostics.averageGenerationDurationMs.toFixed(1)}ms count=${diagnostics.generationSampleCount}`,
      `attach last=${this.lastAttachDurationMs.toFixed(1)}ms avg=${this.averageAttachDurationMs.toFixed(1)}ms count=${this.attachedChunkCount}`,
    ].join('\n')
  }
}
