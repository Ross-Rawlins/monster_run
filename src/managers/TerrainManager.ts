import * as Phaser from 'phaser'
import PlayableCharacter from '../characters/PlayableCharacter'
import { RUNNER_ASSET_KEYS } from '../config/keys'
import { TerrainGenerator } from '../world/terrain/TerrainGenerator'
import {
  TerrainChunkSpec,
  TerrainPlatformSpec,
} from '../world/terrain/types/terrainGeneratorTypes'
import { TerrainGridDebug } from '../world/terrain/TerrainGridDebug'
import { resolveTerrainFrame } from '../world/terrain/terrainTileRules'

interface TerrainColliderSlot {
  rect: Phaser.GameObjects.Rectangle
  worldX: number
  worldY: number
  width: number
  active: boolean
}

interface TerrainChunkSlot {
  visual: Phaser.GameObjects.RenderTexture
  colliders: TerrainColliderSlot[]
  debugText: Phaser.GameObjects.Text
  chunkIndex: number | null
  spec: TerrainChunkSpec | null
  occupancy: Array<{
    tileX: number
    tileY: number
    frameIndex: number
  }>
}

interface TerrainResetOptions {
  seed?: number
}

export class TerrainManager {
  private readonly tileSourceSize = 16

  private readonly tileScale: number

  private readonly tileWorldSize: number

  private readonly chunkWidthTiles = 16

  private readonly chunkWorldWidth: number

  private readonly sourceHeight: number

  private readonly visibleChunkCount: number

  private readonly maxPlatformsPerChunk = 6

  private readonly collisionHeight = 12

  private readonly atlasKey = RUNNER_ASSET_KEYS.TILES_ATLAS

  private readonly playfieldBottomRow = 21

  private readonly generator: TerrainGenerator

  private readonly debugGridRows = 22

  private readonly chunkSlots: TerrainChunkSlot[] = []

  private debugVisible = false

  private readonly gridDebug: TerrainGridDebug

  private currentSeed = 0

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly cameraWidth: number,
    private readonly sceneHeight: number
  ) {
    this.tileWorldSize = this.sceneHeight / this.debugGridRows
    this.tileScale = this.tileWorldSize / this.tileSourceSize
    this.chunkWorldWidth = this.chunkWidthTiles * this.tileWorldSize
    this.sourceHeight = Math.ceil(this.sceneHeight / this.tileScale)
    this.visibleChunkCount =
      Math.ceil(this.cameraWidth / this.chunkWorldWidth) + 4

    this.currentSeed = this.createRandomSeed()
    this.generator = new TerrainGenerator(
      {
        chunkWidthTiles: this.chunkWidthTiles,
        minSurfaceRow: 4,
        maxSurfaceRow: 18,
        baselineSurfaceRow: 9,
        playfieldBottomRow: 21,
        maxUpStepTiles: 6,
        maxDownStepTiles: 6,
        maxGapTiles: 10,
      },
      this.currentSeed
    )
    this.gridDebug = new TerrainGridDebug(this.scene, cameraWidth, sceneHeight)
    this.createChunkPool()
  }

  public bindPlayer(player: PlayableCharacter): void {
    this.chunkSlots.forEach((slot) => {
      slot.colliders.forEach((collider) => {
        this.scene.physics.add.collider(player, collider.rect)
      })
    })
  }

  public getSpawnSurfaceY(): number {
    return this.generator.getSpawnSurfaceY(this.tileWorldSize)
  }

  public update(scrollX: number): void {
    const firstRequiredChunk = Math.max(
      0,
      Math.floor(scrollX / this.chunkWorldWidth) - 1
    )
    const lastRequiredChunk = firstRequiredChunk + this.visibleChunkCount - 1

    for (
      let chunkIndex = firstRequiredChunk;
      chunkIndex <= lastRequiredChunk;
      chunkIndex += 1
    ) {
      if (!this.hasSlotForChunk(chunkIndex)) {
        this.assignChunkToSlot(
          chunkIndex,
          firstRequiredChunk,
          lastRequiredChunk
        )
      }
    }

    this.chunkSlots.forEach((slot) => {
      if (!slot.spec || slot.chunkIndex == null) {
        slot.visual.setVisible(false)
        this.deactivateColliders(slot)
        return
      }

      const chunkScreenX = slot.spec.startTileX * this.tileWorldSize - scrollX
      slot.visual.setVisible(true)
      slot.visual.x = Math.round(chunkScreenX)
      slot.debugText.setVisible(this.debugVisible)
      slot.debugText.setPosition(Math.round(chunkScreenX + 8), 16)
      slot.debugText.setText(
        `chunk=${slot.spec.chunkIndex} ${slot.spec.templateId}\nentry=${slot.spec.entryRow} exit=${slot.spec.exitRow}`
      )

      slot.colliders.forEach((collider) => {
        if (!collider.active) {
          collider.rect.setVisible(false)
          return
        }

        collider.rect.setVisible(this.debugVisible)
        collider.rect.x = Math.round(
          collider.worldX - scrollX + collider.width * 0.5
        )
        collider.rect.y = Math.round(
          collider.worldY + this.collisionHeight * 0.5
        )
      })
    })

    if (this.gridDebug.isVisible()) {
      const occupancy = this.getVisibleTileOccupancy()

      this.gridDebug.drawTileGrid(scrollX, occupancy)
    }
  }

  public toggleGridDebug(): boolean {
    return this.gridDebug.toggleGridVisible()
  }

  private getVisibleTileOccupancy(): Array<{
    tileX: number
    tileY: number
    frameIndex: number
  }> {
    const occupancy: Array<{
      tileX: number
      tileY: number
      frameIndex: number
    }> = []

    this.chunkSlots.forEach((slot) => {
      occupancy.push(...slot.occupancy)
    })

    return occupancy
  }

  public reset(options: TerrainResetOptions = {}): void {
    this.currentSeed = options.seed ?? this.createRandomSeed()
    this.generator.reset(this.currentSeed)

    this.chunkSlots.forEach((slot) => {
      slot.chunkIndex = null
      slot.spec = null
      slot.visual.clear()
      slot.visual.setVisible(false)
      slot.debugText.setVisible(false)
      slot.occupancy = []
      this.deactivateColliders(slot)
    })
  }

  public setDebugVisible(isVisible: boolean): void {
    this.debugVisible = isVisible
  }

  public isDebugVisible(): boolean {
    return this.debugVisible
  }

  public getCurrentSeed(): number {
    return this.currentSeed
  }

  public getDebugSummary(): string {
    const activeChunks = this.chunkSlots.filter(
      (slot) => slot.spec != null
    ).length
    const activePlatforms = this.chunkSlots.reduce((total, slot) => {
      return total + slot.colliders.filter((collider) => collider.active).length
    }, 0)

    return `terrainChunks=${activeChunks} terrainPlatforms=${activePlatforms} seed=${this.currentSeed}`
  }

  public destroy(): void {
    this.chunkSlots.forEach((slot) => {
      slot.visual.destroy()
      slot.debugText.destroy()
      slot.colliders.forEach((collider) => collider.rect.destroy())
    })
    this.gridDebug.destroy()
  }

  private createChunkPool(): void {
    for (let index = 0; index < this.visibleChunkCount; index += 1) {
      const visual = this.scene.add
        .renderTexture(
          0,
          0,
          this.chunkWidthTiles * this.tileSourceSize,
          this.sourceHeight
        )
        .setOrigin(0, 0)
        .setScale(this.tileScale)
        .setDepth(7)
        .setVisible(false)

      const debugText = this.scene.add
        .text(0, 0, '', {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#fce6a8',
          backgroundColor: '#203040',
          padding: { x: 4, y: 3 },
        })
        .setDepth(40)
        .setScrollFactor(0)
        .setVisible(false)

      const colliders: TerrainColliderSlot[] = []

      for (
        let colliderIndex = 0;
        colliderIndex < this.maxPlatformsPerChunk;
        colliderIndex += 1
      ) {
        const rect = this.scene.add.rectangle(
          -1000,
          -1000,
          this.tileWorldSize,
          this.collisionHeight,
          0xff00ff,
          0
        )
        this.scene.physics.add.existing(rect)

        const body = rect.body as Phaser.Physics.Arcade.Body
        body.setAllowGravity(false)
        body.setImmovable(true)

        colliders.push({
          rect,
          worldX: -1000,
          worldY: -1000,
          width: this.tileWorldSize,
          active: false,
        })
      }

      this.chunkSlots.push({
        visual,
        colliders,
        debugText,
        chunkIndex: null,
        spec: null,
        occupancy: [],
      })
    }
  }

  private hasSlotForChunk(chunkIndex: number): boolean {
    return this.chunkSlots.some((slot) => slot.chunkIndex === chunkIndex)
  }

  private assignChunkToSlot(
    chunkIndex: number,
    firstRequiredChunk: number,
    lastRequiredChunk: number
  ): void {
    const spec = this.generator.getChunk(chunkIndex)
    const slot = this.findReusableSlot(firstRequiredChunk, lastRequiredChunk)

    slot.chunkIndex = chunkIndex
    slot.spec = spec
    this.renderChunk(slot, spec)
  }

  private findReusableSlot(
    firstRequiredChunk: number,
    lastRequiredChunk: number
  ): TerrainChunkSlot {
    const inactiveSlot = this.chunkSlots.find((slot) => slot.chunkIndex == null)

    if (inactiveSlot) {
      return inactiveSlot
    }

    const recyclableSlot = this.chunkSlots.find((slot) => {
      if (slot.chunkIndex == null) {
        return true
      }

      return (
        slot.chunkIndex < firstRequiredChunk ||
        slot.chunkIndex > lastRequiredChunk
      )
    })

    if (!recyclableSlot) {
      throw new Error('No terrain chunk slot available for recycling')
    }

    return recyclableSlot
  }

  private renderChunk(slot: TerrainChunkSlot, spec: TerrainChunkSpec): void {
    slot.visual.clear()
    slot.occupancy = []
    this.deactivateColliders(slot)

    const solidityGrid = this.buildSolidityGrid(spec)

    slot.occupancy = this.drawSolidityGrid(slot.visual, spec, solidityGrid)

    spec.platforms
      .slice(0, this.maxPlatformsPerChunk)
      .forEach((platform, index) => {
        this.drawPlatform(slot.visual, platform)
        this.configureCollider(slot.colliders[index], spec, platform)
      })
  }

  private deactivateColliders(slot: TerrainChunkSlot): void {
    slot.colliders.forEach((collider) => {
      collider.active = false
      collider.rect.x = -1000
      collider.rect.y = -1000
      collider.rect.setVisible(false)
    })

    slot.debugText.setVisible(false)
  }

  private configureCollider(
    collider: TerrainColliderSlot,
    chunk: TerrainChunkSpec,
    platform: TerrainPlatformSpec
  ): void {
    const worldX = (chunk.startTileX + platform.localTileX) * this.tileWorldSize
    const worldY =
      (this.playfieldBottomRow - platform.topRow) * this.tileWorldSize
    const width = platform.widthTiles * this.tileWorldSize

    collider.worldX = worldX
    collider.worldY = worldY
    collider.width = width
    collider.active = true

    collider.rect.width = width
    collider.rect.height = this.collisionHeight

    const body = collider.rect.body as Phaser.Physics.Arcade.Body
    body.setSize(width, this.collisionHeight)
  }

  private drawPlatform(
    _renderTexture: Phaser.GameObjects.RenderTexture,
    _platform: TerrainPlatformSpec
  ): void {
    // Terrain visuals are resolved from the unioned chunk grid in drawSolidityGrid().
  }

  private createRandomSeed(): number {
    return Math.floor(Math.random() * 0xffffffff)
  }

  private buildSolidityGrid(spec: TerrainChunkSpec): boolean[][] {
    const rowCount = this.playfieldBottomRow + 1
    const grid = Array.from({ length: rowCount }, () =>
      new Array<boolean>(this.chunkWidthTiles).fill(false)
    )

    spec.platforms.forEach((platform) => {
      const startRow = Math.max(0, platform.topRow)
      const endRow = Math.min(
        rowCount,
        platform.topRow + platform.bodyDepthTiles
      )
      const startCol = Math.max(0, platform.localTileX)
      const endCol = Math.min(
        this.chunkWidthTiles,
        platform.localTileX + platform.widthTiles
      )

      for (let row = startRow; row < endRow; row += 1) {
        for (let col = startCol; col < endCol; col += 1) {
          grid[row][col] = true
        }
      }
    })

    return grid
  }

  private drawSolidityGrid(
    renderTexture: Phaser.GameObjects.RenderTexture,
    spec: TerrainChunkSpec,
    grid: boolean[][]
  ): Array<{ tileX: number; tileY: number; frameIndex: number }> {
    const occupancy: Array<{
      tileX: number
      tileY: number
      frameIndex: number
    }> = []
    const atlasTexture = this.scene.textures.get(this.atlasKey)

    if (!atlasTexture) {
      return occupancy
    }

    for (let row = 0; row < grid.length; row += 1) {
      for (let col = 0; col < this.chunkWidthTiles; col += 1) {
        if (!grid[row][col]) {
          continue
        }

        const frame = resolveTerrainFrame(
          grid,
          col,
          row,
          spec.biome,
          spec.chunkIndex * 131 + row * 17 + col
        )

        if (!atlasTexture.has(frame)) {
          continue
        }

        renderTexture.drawFrame(
          this.atlasKey,
          frame,
          col * this.tileSourceSize,
          (this.playfieldBottomRow - row) * this.tileSourceSize
        )

        occupancy.push({
          tileX: spec.startTileX + col,
          tileY: row,
          frameIndex: this.extractFrameIndex(frame),
        })
      }
    }

    return occupancy
  }

  private extractFrameIndex(frameName: string): number {
    const frameIndexPattern = /_(\d+)\.png$/
    const match = frameIndexPattern.exec(frameName)

    if (!match) {
      return -1
    }

    return Number.parseInt(match[1], 10)
  }
}
