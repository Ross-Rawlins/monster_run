import { SUPPORT_GENERATION_CONSTRAINTS } from '../../../config/supportGeneration'
import { Tile } from '../TileTypes'
import { clamp, randomInt } from '../generators/GenerationMath'

interface PlatformSegment {
  startColumn: number
  endColumn: number
  bottomRow: number
}

interface SupportGeneratorOptions {
  width: number
  height: number
  random: () => number
}

interface Span {
  left: number
  right: number
}

export class SupportGenerator {
  private readonly width: number
  private readonly height: number
  private readonly random: () => number

  constructor(options: SupportGeneratorOptions) {
    this.width = options.width
    this.height = options.height
    this.random = options.random
  }

  public placeSupports(tiles: Tile[][]): void {
    const segments = this.findPlatformSegments(tiles)

    for (const segment of segments) {
      this.buildSupportForSegment(tiles, segment)
    }
  }

  private buildSupportForSegment(
    tiles: Tile[][],
    segment: PlatformSegment
  ): void {
    const startRow = segment.bottomRow + 1
    if (startRow >= this.height) {
      return
    }

    const minWidth = SUPPORT_GENERATION_CONSTRAINTS.minSupportWidth
    const maxFlare = Math.max(0, SUPPORT_GENERATION_CONSTRAINTS.maxFlareColumns)
    const flareTarget = maxFlare > 0 ? randomInt(0, maxFlare, this.random) : 0

    const segmentWidth = segment.endColumn - segment.startColumn + 1
    const topSpan = this.ensureMinWidth(
      {
        left: segment.startColumn,
        right: segment.endColumn,
      },
      minWidth
    )

    const totalRows = Math.max(1, this.height - startRow)

    for (let row = startRow; row < this.height; row += 1) {
      const depth = row - startRow
      const progress = depth / totalRows
      const flare = Math.round(flareTarget * progress)

      // Rule-based span growth from platform anchor to lower rows.
      const desiredSpan = this.ensureMinWidth(
        {
          left: topSpan.left - flare,
          right: topSpan.right + flare,
        },
        Math.max(minWidth, segmentWidth)
      )

      const writableSpan = this.resolveWritableSpan(tiles, row, desiredSpan)
      if (!writableSpan) {
        continue
      }

      this.paintSupportRow(tiles, row, writableSpan)

      if (
        SUPPORT_GENERATION_CONSTRAINTS.stopWhenTouchingGround &&
        this.spanTouchesGroundBelow(tiles, row, writableSpan)
      ) {
        return
      }
    }
  }

  private resolveWritableSpan(
    tiles: Tile[][],
    row: number,
    desired: Span
  ): Span | null {
    const left = clamp(desired.left, 0, this.width - 1)
    const right = clamp(desired.right, 0, this.width - 1)

    let resolvedLeft = -1
    let resolvedRight = -1

    for (let col = left; col <= right; col += 1) {
      const tile = tiles[row][col]
      // Negative constraints: supports cannot overwrite platform/ground.
      if (tile === Tile.PLATFORM || tile === Tile.GROUND) {
        continue
      }

      if (resolvedLeft < 0) {
        resolvedLeft = col
      }
      resolvedRight = col
    }

    if (resolvedLeft < 0 || resolvedRight < resolvedLeft) {
      return null
    }

    return { left: resolvedLeft, right: resolvedRight }
  }

  private paintSupportRow(tiles: Tile[][], row: number, span: Span): void {
    for (let col = span.left; col <= span.right; col += 1) {
      if (tiles[row][col] === Tile.EMPTY) {
        tiles[row][col] = Tile.SUPPORT
      }
    }
  }

  private spanTouchesGroundBelow(
    tiles: Tile[][],
    row: number,
    span: Span
  ): boolean {
    if (row + 1 >= this.height) {
      return true
    }

    for (let col = span.left; col <= span.right; col += 1) {
      if (tiles[row + 1][col] === Tile.GROUND) {
        return true
      }
    }

    return false
  }

  private ensureMinWidth(span: Span, minWidth: number): Span {
    const currentWidth = span.right - span.left + 1
    if (currentWidth >= minWidth) {
      return {
        left: clamp(span.left, 0, this.width - 1),
        right: clamp(span.right, 0, this.width - 1),
      }
    }

    const center = Math.round((span.left + span.right) * 0.5)
    let left = center - Math.floor((minWidth - 1) * 0.5)
    let right = left + minWidth - 1

    if (left < 0) {
      right -= left
      left = 0
    }

    if (right >= this.width) {
      const shiftLeft = right - (this.width - 1)
      left -= shiftLeft
      right = this.width - 1
    }

    left = clamp(left, 0, this.width - 1)
    right = clamp(right, left, this.width - 1)

    return { left, right }
  }

  private findPlatformSegments(tiles: Tile[][]): PlatformSegment[] {
    const segments: PlatformSegment[] = []

    for (let row = 0; row < this.height; row += 1) {
      let col = 0
      while (col < this.width) {
        if (tiles[row][col] !== Tile.PLATFORM) {
          col += 1
          continue
        }

        const startColumn = col
        while (col + 1 < this.width && tiles[row][col + 1] === Tile.PLATFORM) {
          col += 1
        }
        const endColumn = col

        // Process only the top-most row of each contiguous platform band.
        if (row > 0 && tiles[row - 1][startColumn] === Tile.PLATFORM) {
          col += 1
          continue
        }

        let bottomRow = row
        while (
          bottomRow + 1 < this.height &&
          this.isPlatformBand(tiles, bottomRow + 1, startColumn, endColumn)
        ) {
          bottomRow += 1
        }

        segments.push({ startColumn, endColumn, bottomRow })
        col += 1
      }
    }

    return segments
  }

  private isPlatformBand(
    tiles: Tile[][],
    row: number,
    startColumn: number,
    endColumn: number
  ): boolean {
    for (let col = startColumn; col <= endColumn; col += 1) {
      if (tiles[row][col] !== Tile.PLATFORM) {
        return false
      }
    }

    return true
  }
}
