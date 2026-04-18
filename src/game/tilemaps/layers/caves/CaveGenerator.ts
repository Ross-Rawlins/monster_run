// MIGRATED FROM: SupportGenerator.ts → CaveGenerator
// Uses ILayerGenerator interface with LayerCompositor for tilemap generation.

import { CAVE_GENERATION_CONSTRAINTS } from './CaveConfig'
import { Tile } from '../../TileTypes'
import { clamp, randomInt } from '../../generators/GenerationMath'
import type { GeneratorOptions } from '../../contracts/GeneratorOptions'
import type {
  GeneratorContext,
  ILayerGenerator,
} from '../../contracts/ILayerGenerator'

interface PlatformSegment {
  startColumn: number
  endColumn: number
  topRow: number
  bottomRow: number
}

interface Span {
  left: number
  right: number
}

export class CaveGenerator implements ILayerGenerator {
  private readonly width: number
  private readonly height: number
  private readonly random: () => number

  constructor(options: GeneratorOptions) {
    this.width = options.width
    this.height = options.height
    this.random = options.random
  }

  /** Implements ILayerGenerator. */
  public generate(tiles: Tile[][], context: GeneratorContext): void {
    const platformLayer = context.completedLayers.get('platforms')
    const groundLayer = context.completedLayers.get('ground')
    const terrainRef = this.buildTerrainReference(platformLayer, groundLayer)
    this.placeCaves(tiles, terrainRef)
  }

  /**
   * Writes cave tiles directly into `tiles` using `terrainRef` to locate platform
   * segments and detect ground below.
   */
  private placeCaves(
    tiles: Tile[][],
    terrainRef: ReadonlyArray<ReadonlyArray<Tile>>
  ): void {
    const segments = this.findPlatformSegments(terrainRef)

    for (const segment of segments) {
      this.buildCaveForSegment(tiles, terrainRef, segment)
    }
  }

  private buildTerrainReference(
    platformLayer: ReadonlyArray<ReadonlyArray<Tile>> | undefined,
    groundLayer: ReadonlyArray<ReadonlyArray<Tile>> | undefined
  ): ReadonlyArray<ReadonlyArray<Tile>> {
    if (!platformLayer && !groundLayer) {
      return []
    }
    if (!platformLayer) return groundLayer!
    if (!groundLayer) return platformLayer

    return Array.from({ length: this.height }, (_, row) =>
      Array.from({ length: this.width }, (_, col) => {
        const g = (groundLayer[row]?.[col] as Tile | undefined) ?? Tile.EMPTY
        const p = (platformLayer[row]?.[col] as Tile | undefined) ?? Tile.EMPTY
        return p !== Tile.EMPTY ? p : g
      })
    )
  }

  private buildCaveForSegment(
    tiles: Tile[][],
    terrainRef: ReadonlyArray<ReadonlyArray<Tile>>,
    segment: PlatformSegment
  ): void {
    const minUnderPlatformWidth = 3
    const maxAbovePlatformRows = 4
    const minAbovePlatformRows = 3

    const underPlatformRow = segment.bottomRow + 1
    if (underPlatformRow >= this.height) {
      return
    }
    if (this.height - underPlatformRow < 3) {
      return
    }

    const segmentWidth = segment.endColumn - segment.startColumn + 1
    const guaranteedAnchorWidth = clamp(
      Math.max(
        minUnderPlatformWidth,
        CAVE_GENERATION_CONSTRAINTS.minSupportWidth
      ),
      1,
      segmentWidth
    )

    const anchorSpan = this.buildAnchorSpan(segment, guaranteedAnchorWidth)

    const shouldStartAbovePlatform = this.random() < 0.85
    const abovePlatformRows = shouldStartAbovePlatform
      ? randomInt(minAbovePlatformRows, maxAbovePlatformRows, this.random)
      : 0
    const startRow = Math.max(0, segment.topRow - abovePlatformRows)

    const topCapWidth = clamp(
      randomInt(2, Math.max(2, guaranteedAnchorWidth - 1), this.random),
      1,
      guaranteedAnchorWidth
    )
    const topCapCenter = Math.round((anchorSpan.left + anchorSpan.right) * 0.5)

    const maxFlare = Math.max(0, CAVE_GENERATION_CONSTRAINTS.maxFlareColumns)
    const supportDepthToBottom = Math.max(1, this.height - 1 - underPlatformRow)
    const baseBottomFanOut = Math.max(
      maxFlare + 6,
      Math.floor(supportDepthToBottom * 0.65)
    )
    const maxBottomFanOutLeft = baseBottomFanOut + randomInt(0, 2, this.random)
    const maxBottomFanOutRight = baseBottomFanOut + randomInt(0, 2, this.random)

    const jitterLimit = Math.max(
      0,
      CAVE_GENERATION_CONSTRAINTS.maxHorizontalJitterPerRow
    )
    const jitterStride = Math.max(
      1,
      CAVE_GENERATION_CONSTRAINTS.edgeChangeStrideRows
    )
    let horizontalShift = 0

    const trimTailRows = randomInt(
      CAVE_GENERATION_CONSTRAINTS.trimmedEdgeTailMinRows,
      CAVE_GENERATION_CONSTRAINTS.trimmedEdgeTailMaxRows,
      this.random
    )
    const trimSide = randomInt(0, 2, this.random)
    let previousWritableSpan: Span | null = null

    for (let row = startRow; row < this.height; row += 1) {
      const depthFromStart = row - startRow

      if (
        jitterLimit > 0 &&
        depthFromStart > 0 &&
        depthFromStart % jitterStride === 0
      ) {
        horizontalShift = clamp(
          horizontalShift + randomInt(-1, 1, this.random),
          -jitterLimit,
          jitterLimit
        )
      }

      let desired: Span

      if (row <= underPlatformRow) {
        // Keep a guaranteed direct under-platform contact row so caves are anchored below
        if (row === underPlatformRow) {
          desired = anchorSpan
        } else {
          const prePlatformTotal = Math.max(1, underPlatformRow - startRow)
          const prePlatformProgress = (row - startRow) / prePlatformTotal
          const blendedCenter = Math.round(
            topCapCenter * (1 - prePlatformProgress) +
              Math.round((anchorSpan.left + anchorSpan.right) * 0.5) *
                prePlatformProgress
          )
          const blendedWidth = Math.round(
            topCapWidth * (1 - prePlatformProgress) +
              guaranteedAnchorWidth * prePlatformProgress
          )
          desired = this.buildSpanFromCenter(
            blendedCenter + horizontalShift,
            blendedWidth
          )
        }
      } else {
        const downDepth = row - underPlatformRow
        const downProgress =
          downDepth / Math.max(1, this.height - 1 - underPlatformRow)
        const triangularProgress = Math.pow(downProgress, 0.9)
        const leftFlare = Math.round(maxBottomFanOutLeft * triangularProgress)
        const rightFlare = Math.round(maxBottomFanOutRight * triangularProgress)

        desired = {
          left: anchorSpan.left - leftFlare + horizontalShift,
          right: anchorSpan.right + rightFlare + horizontalShift,
        }
      }

      const rowsToBottom = this.height - row
      if (rowsToBottom <= trimTailRows) {
        if (trimSide === 1 || trimSide === 2) {
          desired.left += 1
        }

        if (trimSide === 0 || trimSide === 2) {
          desired.right -= 1
        }
      }

      const minimumWidthForRow =
        row <= underPlatformRow ? guaranteedAnchorWidth : 1
      let desiredSpan = this.ensureMinWidth(desired, minimumWidthForRow)
      desiredSpan = this.ensureVerticalContinuity(
        desiredSpan,
        previousWritableSpan
      )

      const writableSpan = this.resolveWritableSpan(row, desiredSpan)
      if (!writableSpan) {
        // Prevent floating lower fragments if continuity cannot be maintained.
        return
      }

      this.paintCaveRow(tiles, row, writableSpan)
      previousWritableSpan = writableSpan

      if (
        CAVE_GENERATION_CONSTRAINTS.stopWhenTouchingGround &&
        this.spanTouchesGroundBelow(terrainRef, row, writableSpan)
      ) {
        return
      }
    }
  }

  private buildAnchorSpan(segment: PlatformSegment, width: number): Span {
    const segmentCenter = Math.round(
      (segment.startColumn + segment.endColumn) * 0.5
    )
    const maxOffset = Math.max(
      0,
      Math.floor((segment.endColumn - segment.startColumn + 1 - width) * 0.5)
    )
    const centerOffset =
      maxOffset > 0 ? randomInt(-maxOffset, maxOffset, this.random) : 0
    return this.buildSpanFromCenter(segmentCenter + centerOffset, width)
  }

  private ensureVerticalContinuity(current: Span, previous: Span | null): Span {
    if (!previous) {
      return current
    }

    let left = current.left
    let right = current.right

    // Keep at least one shared column with the previous row so caves remain visually connected
    if (right < previous.left) {
      right = previous.left
    }

    if (left > previous.right) {
      left = previous.right
    }

    if (right < left) {
      right = left
    }

    return {
      left: clamp(left, 0, this.width - 1),
      right: clamp(right, 0, this.width - 1),
    }
  }

  private buildSpanFromCenter(center: number, width: number): Span {
    const safeWidth = Math.max(1, width)
    let left = center - Math.floor((safeWidth - 1) * 0.5)
    let right = left + safeWidth - 1

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

  private resolveWritableSpan(row: number, desired: Span): Span | null {
    if (row < 0 || row >= this.height) {
      return null
    }

    const left = clamp(desired.left, 0, this.width - 1)
    const right = clamp(desired.right, 0, this.width - 1)

    if (right < left) {
      return null
    }

    return { left, right }
  }

  private paintCaveRow(tiles: Tile[][], row: number, span: Span): void {
    for (let col = span.left; col <= span.right; col += 1) {
      if (tiles[row][col] === Tile.EMPTY) {
        tiles[row][col] = Tile.CAVE
      }
    }
  }

  private spanTouchesGroundBelow(
    tiles: ReadonlyArray<ReadonlyArray<Tile>>,
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

  private findPlatformSegments(
    tiles: ReadonlyArray<ReadonlyArray<Tile>>
  ): PlatformSegment[] {
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

        segments.push({ startColumn, endColumn, topRow: row, bottomRow })
        col += 1
      }
    }

    return segments
  }

  private isPlatformBand(
    tiles: ReadonlyArray<ReadonlyArray<Tile>>,
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
