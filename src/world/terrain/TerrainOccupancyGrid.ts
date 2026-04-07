/**
 * Tile occupancy grid approach for authoring exact terrain layouts.
 * Each entry is a row where index is tileX and value is frameIndex (or null for empty).
 *
 * Frame numbers reference Tiles_Ground_Seperated_N from tiles.json.
 * Top surface = frames 1-9
 * Walls/body = frames 17 onwards
 */

export interface TileOccupancyRow {
  [tileX: number]: number | null
}

export class TerrainOccupancyGrid {
  private rows: Map<number, TileOccupancyRow> = new Map()

  constructor(private readonly chunkWidthTiles: number = 16) {}

  public setTile(
    tileX: number,
    tileY: number,
    frameIndex: number | null
  ): void {
    if (!this.rows.has(tileY)) {
      this.rows.set(tileY, {})
    }

    const row = this.rows.get(tileY)!

    if (frameIndex === null) {
      delete row[tileX]
    } else {
      row[tileX] = frameIndex
    }
  }

  public getTile(tileX: number, tileY: number): number | null {
    const row = this.rows.get(tileY)

    if (!row) {
      return null
    }

    return row[tileX] ?? null
  }

  public getChunkOccupancy(
    chunkIndex: number
  ): Array<{ tileX: number; tileY: number; frameIndex: number }> {
    const startTileX = chunkIndex * this.chunkWidthTiles
    const endTileX = startTileX + this.chunkWidthTiles

    const occupancy: Array<{
      tileX: number
      tileY: number
      frameIndex: number
    }> = []

    this.rows.forEach((row, tileY) => {
      Object.entries(row).forEach(([tileXStr, frameIndex]) => {
        const tileX = parseInt(tileXStr, 10)

        if (tileX >= startTileX && tileX < endTileX && frameIndex !== null) {
          occupancy.push({
            tileX,
            tileY,
            frameIndex,
          })
        }
      })
    })

    return occupancy
  }

  public getAllTiles(): Array<{
    tileX: number
    tileY: number
    frameIndex: number
  }> {
    const all: Array<{ tileX: number; tileY: number; frameIndex: number }> = []

    this.rows.forEach((row, tileY) => {
      Object.entries(row).forEach(([tileXStr, frameIndex]) => {
        if (frameIndex !== null) {
          all.push({
            tileX: parseInt(tileXStr, 10),
            tileY,
            frameIndex,
          })
        }
      })
    })

    return all
  }

  public getRowRange(): { minY: number; maxY: number } {
    if (this.rows.size === 0) {
      return { minY: 0, maxY: 0 }
    }

    const keys = Array.from(this.rows.keys())

    return {
      minY: Math.min(...keys),
      maxY: Math.max(...keys),
    }
  }
}
