import * as Phaser from 'phaser'
import { INFINITE_RUNNER_COLORS } from '../../config/colors'
import { DEBUG_GRID_STYLE } from '../../config/debugGrid'
import { RUNNER_ASSET_KEYS } from '../../config/keys'
import { ParallaxBackgroundManager } from '../../managers/ParallaxBackgroundManager'
import type { Chunk, ChunkLifecycle } from '../../types/tilemaps'
import {
  ChunkManager,
  type ActiveChunk,
  type ChunkManagerDiagnostics,
} from '../tilemaps/ChunkManager'
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
import {
  buildSupportRuleSnippet,
  formatSupportNeighborhood,
} from '../tilemaps/supports/SupportRules'

const PLAYER_START_X = TILE_SIZE_PX * 6
const PLAYER_WIDTH = 12
const PLAYER_HEIGHT = 24
const PLAYER_RUN_SPEED = 180
const PLAYER_JUMP_VELOCITY = -360
const CHUNK_TRIGGER_AHEAD_RATIO = 0.7
const WORLD_PADDING_CHUNKS = 2
const TILESET_KEY = 'runner-tileset'
const RUNTIME_HUD_REFRESH_MS = 100
const DEBUG_GRID_ROWS = 20
const DEBUG_GRID_COLUMNS = 60
const SHOW_PARALLAX_IMAGES = false
const SHOW_TILE_IMAGES = true
const CONTINUOUS_SCROLL_TEST_MODE = false
const MANUAL_CAMERA_SCROLL_MODE = true
const FALL_RECOVERY_BUFFER_TILES = 4
const CONTINUOUS_SCROLL_SPEED_PX = 180
const MANUAL_CAMERA_SCROLL_SPEED_PX = 420

interface TileStats {
  empty: number
  ground: number
  platform: number
  support: number
}

type RunnerBody = Phaser.Physics.Arcade.Body
type RunnerSprite = Phaser.GameObjects.Rectangle & { body: RunnerBody }

interface SupportInspectionSelection {
  chunkIndex: number
  row: number
  col: number
}

interface SupportSpanSelection {
  left: number
  right: number
  width: number
}

export default class GameScene extends Phaser.Scene {
  private chunkManager!: ChunkManager
  private player!: RunnerSprite
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private parallaxManager: ParallaxBackgroundManager | null = null
  private debugKey!: Phaser.Input.Keyboard.Key
  private debugOverlayGraphics: Phaser.GameObjects.Graphics | null = null
  private debugTileValueTexts: Phaser.GameObjects.Text[] = []
  private runtimeHudText: Phaser.GameObjects.Text | null = null
  private supportInspectorText: Phaser.GameObjects.Text | null = null
  private supportInspectorHighlight: Phaser.GameObjects.Graphics | null = null
  private selectedSupportTile: SupportInspectionSelection | null = null
  private debugEnabled = true
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
  private lastRuntimeHudUpdateMs = 0

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
    this.debugKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)

    // Optional visual layer while tuning randomization rules.
    if (SHOW_PARALLAX_IMAGES) {
      this.parallaxManager = new ParallaxBackgroundManager(this, sw, sh)
    }

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
        'SPACE = Jump  |  D = Grid overlay  |  Click support tile = inspect',
        {
          fontSize: '12px',
          color: '#ffffff',
        }
      )
      .setAlpha(0.6)
      .setScrollFactor(0)
      .setDepth(200)

    this.runtimeHudText = this.add
      .text(12, 30, '', {
        fontSize: '11px',
        color: '#dce6ff',
        backgroundColor: '#1d2f43',
        padding: { x: 6, y: 4 },
      })
      .setAlpha(0.9)
      .setScrollFactor(0)
      .setDepth(201)

    this.supportInspectorText = this.add
      .text(this.scale.width - 12, 12, 'Click a support tile to inspect it.', {
        fontSize: '11px',
        color: '#f6f3d8',
        backgroundColor: '#352a1e',
        padding: { x: 6, y: 4 },
        align: 'left',
        wordWrap: { width: 420, useAdvancedWrap: true },
      })
      .setOrigin(1, 0)
      .setAlpha(0.95)
      .setScrollFactor(0)
      .setDepth(202)

    this.input.on('pointerdown', this.handleInspectorPointerDown, this)

    this.chunkManager = new ChunkManager((chunk, lifecycle) => {
      this.attachChunk(chunk, lifecycle)
    })

    this.events.once('shutdown', () => {
      this.chunkManager.destroy()
      this.parallaxManager?.destroy()
      this.parallaxManager = null
      this.clearDebugOverlay()
      this.runtimeHudText?.destroy()
      this.runtimeHudText = null
      this.supportInspectorText?.destroy()
      this.supportInspectorText = null
      this.supportInspectorHighlight?.destroy()
      this.supportInspectorHighlight = null
      this.input.off('pointerdown', this.handleInspectorPointerDown, this)
    })
  }

  private handleInspectorPointerDown(pointer: Phaser.Input.Pointer): void {
    const selection = this.resolveTileSelection(pointer.worldX, pointer.worldY)

    if (!selection) {
      this.clearSupportInspection('Click a support tile to inspect it.')
      return
    }

    const activeChunk = this.getActiveChunkByIndex(selection.chunkIndex)

    if (!activeChunk) {
      return
    }

    const tile = activeChunk.chunk.tiles[selection.row][selection.col]
    if (tile !== Tile.SUPPORT) {
      const displayValue = tile === Tile.EMPTY ? -1 : tile
      this.clearSupportInspection(
        `Selected tile ${displayValue} at chunk=${selection.chunkIndex} row=${selection.row} col=${selection.col}.\nClick a support tile to generate a rule snippet.`
      )
      return
    }

    this.selectedSupportTile = selection

    const resolvedFrame = getRenderFrameForTileAt(
      activeChunk.chunk.tiles,
      selection.row,
      selection.col
    )
    const oneBasedFrameNumber =
      resolvedFrame >= 0 ? resolvedFrame + 1 : undefined
    const snippet = buildSupportRuleSnippet(
      activeChunk.chunk.tiles,
      selection.row,
      selection.col,
      resolvedFrame
    )
    const supportSpan = this.getSupportSpanSelection(
      activeChunk.chunk,
      selection.row,
      selection.col
    )

    this.copySnippetToClipboard(snippet)
    this.updateSupportInspectorText(
      [
        `Support tile at chunk=${selection.chunkIndex} row=${selection.row} col=${selection.col}`,
        `copied=rule snippet  frame=${oneBasedFrameNumber ?? 'none'} (${resolvedFrame})`,
        `spanWidth=${supportSpan.width}  span=[${supportSpan.left}..${supportSpan.right}]  minRequired=4`,
        formatSupportNeighborhood(
          activeChunk.chunk.tiles,
          selection.row,
          selection.col
        ),
        '',
        snippet,
      ].join('\n')
    )
    this.redrawInspectorHighlight()
  }

  private clearSupportInspection(message: string): void {
    this.selectedSupportTile = null
    this.updateSupportInspectorText(message)
    this.redrawInspectorHighlight()
  }

  private getActiveChunkByIndex(chunkIndex: number): ActiveChunk | undefined {
    return this.chunkManager
      .getActiveChunksSnapshot()
      .find((candidate) => candidate.lifecycle.chunkIndex === chunkIndex)
  }

  private getSupportSpanSelection(
    chunk: Chunk,
    row: number,
    col: number
  ): SupportSpanSelection {
    let left = col
    let right = col

    while (left - 1 >= 0 && chunk.tiles[row][left - 1] === Tile.SUPPORT) {
      left -= 1
    }

    while (
      right + 1 < GRID_WIDTH &&
      chunk.tiles[row][right + 1] === Tile.SUPPORT
    ) {
      right += 1
    }

    return {
      left,
      right,
      width: right - left + 1,
    }
  }

  private resolveTileSelection(
    worldX: number,
    worldY: number
  ): SupportInspectionSelection | null {
    if (
      worldY < this.chunkOffsetY ||
      worldY >= this.chunkOffsetY + this.runtimeChunkHeightPx
    ) {
      return null
    }

    const chunkIndex = Math.floor(worldX / this.runtimeChunkWidthPx)
    const row = Math.floor(
      (worldY - this.chunkOffsetY) / this.runtimeTileSizePx
    )
    const col = Math.floor(
      (worldX - chunkIndex * this.runtimeChunkWidthPx) / this.runtimeTileSizePx
    )

    if (
      chunkIndex < 0 ||
      row < 0 ||
      row >= GRID_HEIGHT ||
      col < 0 ||
      col >= GRID_WIDTH
    ) {
      return null
    }

    return { chunkIndex, row, col }
  }

  private redrawInspectorHighlight(): void {
    this.supportInspectorHighlight?.destroy()
    this.supportInspectorHighlight = null

    if (!this.selectedSupportTile) {
      return
    }

    const { chunkIndex, row, col } = this.selectedSupportTile
    const x =
      chunkIndex * this.runtimeChunkWidthPx + col * this.runtimeTileSizePx
    const y = this.chunkOffsetY + row * this.runtimeTileSizePx

    this.supportInspectorHighlight = this.add.graphics().setDepth(120)
    this.supportInspectorHighlight.lineStyle(3, 0xffe066, 1)
    this.supportInspectorHighlight.strokeRect(
      x + 1,
      y + 1,
      this.runtimeTileSizePx - 2,
      this.runtimeTileSizePx - 2
    )
  }

  private updateSupportInspectorText(message: string): void {
    this.supportInspectorText?.setText(message)
  }

  private copySnippetToClipboard(snippet: string): void {
    const clipboard = globalThis.navigator?.clipboard
    if (!clipboard) {
      return
    }

    void clipboard.writeText(snippet).catch(() => {
      // Ignore clipboard permission failures and keep the snippet visible in the HUD.
    })
  }

  public update(): void {
    this.updateRuntimeHud()

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
    this.handleDebugToggle()

    if (
      !MANUAL_CAMERA_SCROLL_MODE &&
      this.player.y >
        this.scale.height + this.runtimeTileSizePx * FALL_RECOVERY_BUFFER_TILES
    ) {
      this.recoverPlayerForGenerationTest()
    }
  }

  private updatePlayerMovement(): void {
    const body = this.player.body
    const wantsLeft = this.cursors.left?.isDown ?? false
    const wantsRight = this.cursors.right?.isDown ?? false

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
    this.chunkManager.destroyStaleChunks(cameraScrollX)

    const triggerX = Math.max(
      this.player.x,
      cameraScrollX + this.scale.width * CHUNK_TRIGGER_AHEAD_RATIO
    )

    if (triggerX <= this.nextChunkTriggerX) {
      return
    }

    this.chunkManager.triggerNextChunk()
    this.nextChunkTriggerX += this.runtimeChunkWidthPx
    this.preExtendWorldBounds(this.nextChunkTriggerX + this.runtimeChunkWidthPx)
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
    const collisionTilemapData = chunk.tiles.map((row, rowIndex) =>
      row.map((_, colIndex) =>
        getRenderFrameForTileAt(chunk.tiles, rowIndex, colIndex)
      )
    )

    const supportVisualTilemapData = chunk.tiles.map((row, rowIndex) =>
      row.map((tile, colIndex) =>
        tile === Tile.SUPPORT
          ? getRenderFrameForTileAt(chunk.tiles, rowIndex, colIndex)
          : TILE_RENDER_INDEX[Tile.EMPTY]
      )
    )

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

    const supportVisualTilemap = this.make.tilemap({
      data: supportVisualTilemapData,
      tileWidth: TILE_SIZE_PX,
      tileHeight: TILE_SIZE_PX,
    })
    const supportVisualTileset = supportVisualTilemap.addTilesetImage(
      TILESET_KEY,
      TILESET_KEY,
      TILE_SIZE_PX,
      TILE_SIZE_PX,
      0,
      0
    )

    if (!supportVisualTileset) {
      throw new Error(
        `Unable to create support visual tileset using texture key ${TILESET_KEY}`
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

    const supportVisualLayer = supportVisualTilemap.createLayer(
      0,
      supportVisualTileset,
      lifecycle.chunkIndex * this.runtimeChunkWidthPx,
      this.chunkOffsetY
    )

    layer.setDepth(1)
    layer.setScale(this.runtimeTileScale)
    layer.setCollision(this.getCollisionTileIndices())
    layer.setVisible(SHOW_TILE_IMAGES)

    if (supportVisualLayer) {
      supportVisualLayer.setDepth(2)
      supportVisualLayer.setScale(this.runtimeTileScale)
      supportVisualLayer.setVisible(false)
    }

    const chunkRightEdgePx =
      (lifecycle.chunkIndex + 1) * this.runtimeChunkWidthPx

    const collider = this.physics.add.collider(this.player, layer)
    const activeChunk: ActiveChunk = {
      chunk,
      tilemap,
      layer,
      visualTilemap: supportVisualTilemap,
      visualLayer: supportVisualLayer ?? undefined,
      collider,
      lifecycle,
      rightEdgePx: chunkRightEdgePx,
    }

    this.chunkManager.registerActiveChunk(activeChunk)
    this.updateWorldBounds(chunkRightEdgePx)
    if (this.debugEnabled) {
      this.redrawDebugOverlay()
    }

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
    const collisionTileIndices = new Set<number>()

    for (const tile of COLLIDABLE_TILES) {
      for (const frameIndex of getCollisionFrameIndicesForTile(tile)) {
        if (frameIndex >= 0) {
          collisionTileIndices.add(frameIndex)
        }
      }
    }

    return Array.from(collisionTileIndices)
  }

  private redrawDebugOverlay(): void {
    this.clearDebugOverlay()
    this.drawDebugChunkOverlay()
  }

  /**
   * Draw a world-space square grid aligned to each active chunk (20x60).
   * Because this uses world coordinates, it follows generated elements while scrolling.
   */
  private drawDebugChunkOverlay(): void {
    if (!this.debugEnabled) {
      return
    }

    const cellSize = this.runtimeTileSizePx
    const gridWidth = cellSize * DEBUG_GRID_COLUMNS
    const gridHeight = cellSize * DEBUG_GRID_ROWS

    this.debugOverlayGraphics = this.add.graphics().setDepth(100)

    this.debugOverlayGraphics.lineStyle(
      1,
      DEBUG_GRID_STYLE.lineColor,
      DEBUG_GRID_STYLE.lineAlpha
    )

    const activeChunks = this.chunkManager.getActiveChunksSnapshot()
    if (activeChunks.length === 0) {
      return
    }

    const fontSizePx = Math.max(
      DEBUG_GRID_STYLE.labelMinFontSizePx,
      Math.round(cellSize * DEBUG_GRID_STYLE.labelFontSizeFactor)
    )

    for (const activeChunk of activeChunks) {
      const xOffset =
        activeChunk.lifecycle.chunkIndex * this.runtimeChunkWidthPx
      const yOffset = this.chunkOffsetY

      this.drawChunkGridLines(xOffset, yOffset, cellSize, gridWidth, gridHeight)
      this.drawChunkTileValues(
        activeChunk.chunk,
        xOffset,
        yOffset,
        cellSize,
        fontSizePx
      )
    }
  }

  private drawChunkGridLines(
    xOffset: number,
    yOffset: number,
    cellSize: number,
    gridWidth: number,
    gridHeight: number
  ): void {
    if (!this.debugOverlayGraphics) {
      return
    }

    for (let row = 0; row <= DEBUG_GRID_ROWS; row += 1) {
      const y = Math.round(yOffset + row * cellSize) + 0.5
      this.debugOverlayGraphics.beginPath()
      this.debugOverlayGraphics.moveTo(xOffset + 0.5, y)
      this.debugOverlayGraphics.lineTo(xOffset + gridWidth + 0.5, y)
      this.debugOverlayGraphics.strokePath()
    }

    for (let col = 0; col <= DEBUG_GRID_COLUMNS; col += 1) {
      const x = Math.round(xOffset + col * cellSize) + 0.5
      this.debugOverlayGraphics.beginPath()
      this.debugOverlayGraphics.moveTo(x, yOffset + 0.5)
      this.debugOverlayGraphics.lineTo(x, yOffset + gridHeight + 0.5)
      this.debugOverlayGraphics.strokePath()
    }
  }

  private drawChunkTileValues(
    chunk: Chunk,
    xOffset: number,
    yOffset: number,
    cellSize: number,
    fontSizePx: number
  ): void {
    if (!this.debugOverlayGraphics) {
      return
    }

    for (let row = 0; row < GRID_HEIGHT; row += 1) {
      for (let col = 0; col < GRID_WIDTH; col += 1) {
        const tile = chunk.tiles[row][col]
        const resolvedFrame = getRenderFrameForTileAt(chunk.tiles, row, col)
        const isUnresolvedTile =
          tile !== Tile.EMPTY && resolvedFrame === TILE_RENDER_INDEX[Tile.EMPTY]
        const labelText = this.getDebugLabelText(tile, isUnresolvedTile)

        this.drawDebugCellFill(
          tile,
          isUnresolvedTile,
          xOffset + col * cellSize,
          yOffset + row * cellSize,
          cellSize
        )

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
        this.debugTileValueTexts.push(label)
      }
    }
  }

  private getDebugLabelText(tile: Tile, isUnresolvedTile: boolean): string {
    if (tile === Tile.EMPTY) {
      return '-1'
    }

    return isUnresolvedTile ? String(tile) : ''
  }

  private drawDebugCellFill(
    tile: Tile,
    isUnresolvedTile: boolean,
    x: number,
    y: number,
    cellSize: number
  ): void {
    if (!isUnresolvedTile) {
      return
    }

    if (tile === Tile.GROUND) {
      this.fillDebugCell(
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
        DEBUG_GRID_STYLE.platformCellColor,
        DEBUG_GRID_STYLE.platformCellAlpha,
        x,
        y,
        cellSize
      )
      return
    }

    if (tile === Tile.SUPPORT) {
      this.fillDebugCell(
        DEBUG_GRID_STYLE.supportCellColor,
        DEBUG_GRID_STYLE.supportCellAlpha,
        x,
        y,
        cellSize
      )
    }
  }

  private fillDebugCell(
    color: number,
    alpha: number,
    x: number,
    y: number,
    cellSize: number
  ): void {
    if (!this.debugOverlayGraphics) {
      return
    }

    this.debugOverlayGraphics.fillStyle(color, alpha)
    this.debugOverlayGraphics.fillRect(x, y, cellSize, cellSize)
  }

  /** Remove all debug graphics. */
  private clearDebugOverlay(): void {
    this.debugOverlayGraphics?.destroy()
    this.debugOverlayGraphics = null
    this.debugTileValueTexts.forEach((text) => {
      text.destroy()
    })
    this.debugTileValueTexts = []
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
      for (const row of activeChunk.chunk.tiles) {
        for (const tile of row) {
          if (tile === Tile.EMPTY) {
            stats.empty += 1
          } else if (tile === Tile.GROUND) {
            stats.ground += 1
          } else if (tile === Tile.PLATFORM) {
            stats.platform += 1
          } else if (tile === Tile.SUPPORT) {
            stats.support += 1
          }
        }
      }
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
    ].join('\n')
  }
}
