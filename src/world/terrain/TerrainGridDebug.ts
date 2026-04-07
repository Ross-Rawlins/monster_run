import * as Phaser from 'phaser'
import { TileOccupancy } from './types/terrainDebugTypes'

export type { TileOccupancy } from './types/terrainDebugTypes'

export class TerrainGridDebug {
  private gridGraphics: Phaser.GameObjects.Graphics | null = null

  private readonly gridRows = 22

  private isGridVisible = false

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly cameraWidth: number,
    private readonly sceneHeight: number
  ) {}

  public toggleGridVisible(): boolean {
    this.isGridVisible = !this.isGridVisible

    if (!this.isGridVisible) {
      this.clearGrid()
    }

    return this.isGridVisible
  }

  public isVisible(): boolean {
    return this.isGridVisible
  }

  public drawTileGrid(_scrollX: number, _occupancy: TileOccupancy[]): void {
    if (!this.isGridVisible) {
      return
    }

    this.clearGrid()

    const gridGraphics = this.scene.add.graphics()
    gridGraphics.setDepth(50)
    gridGraphics.lineStyle(1, 0xff0000, 0.8)

    const tileWorldSize = this.sceneHeight / this.gridRows
    const gridColumns = Math.ceil(this.cameraWidth / tileWorldSize)

    for (let column = 0; column <= gridColumns; column += 1) {
      const screenX = column * tileWorldSize

      gridGraphics.beginPath()
      gridGraphics.moveTo(screenX, 0)
      gridGraphics.lineTo(screenX, this.sceneHeight)
      gridGraphics.strokePath()
    }

    for (let row = 0; row <= this.gridRows; row += 1) {
      const screenY = this.sceneHeight - row * tileWorldSize

      gridGraphics.beginPath()
      gridGraphics.moveTo(0, screenY)
      gridGraphics.lineTo(this.cameraWidth, screenY)
      gridGraphics.strokePath()
    }

    this.gridGraphics = gridGraphics
  }

  public clearGrid(): void {
    if (this.gridGraphics) {
      this.gridGraphics.destroy()
      this.gridGraphics = null
    }
  }

  public destroy(): void {
    this.clearGrid()
  }
}
