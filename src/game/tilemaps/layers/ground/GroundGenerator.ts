import { GROUND_GENERATION_CONSTRAINTS } from './GroundRules'
import { Tile } from '../../TileTypes'
import { randomInt } from '../../generators/GenerationMath'
import type { GeneratorOptions } from '../../contracts/GeneratorOptions'
import type {
  GeneratorContext,
  ILayerGenerator,
} from '../../contracts/ILayerGenerator'

export class GroundGenerator implements ILayerGenerator {
  private readonly width: number
  private readonly height: number
  private readonly random: () => number
  private carryInOpenSectionStyleIndex: number | null = null
  private topStyleByColumn: number[] = []
  private rightOpenSectionStyleIndex: number | null = null

  constructor(options: GeneratorOptions) {
    this.width = options.width
    this.height = options.height
    this.random = options.random
  }

  /** Implements ILayerGenerator. */
  public generate(tiles: Tile[][], context: GeneratorContext): void {
    this.placeGround(tiles, context.seededLeftColumn)
    this.normalizeNarrowGroundColumns(tiles, context.seededLeftColumn)
    this.normalizeSingleColumnHeightRuns(tiles, context.seededLeftColumn)
    this.buildTopStyleAssignments(tiles, context.seededLeftColumn)
  }

  public seedCarryInOpenSectionStyleIndex(styleIndex: number | null): void {
    this.carryInOpenSectionStyleIndex = styleIndex
  }

  public getTopStyleByColumn(): number[] {
    return [...this.topStyleByColumn]
  }

  public getRightOpenSectionStyleIndex(): number | null {
    return this.rightOpenSectionStyleIndex
  }

  private placeGround(tiles: Tile[][], seededLeftColumn: Tile[] | null): void {
    let x = seededLeftColumn ? 1 : 0
    const seededHasGround = this.seededColumnHasGround(seededLeftColumn)

    if (seededLeftColumn && !seededHasGround) {
      // Continue a boundary gap for at least the minimum gap width
      // (including column 0 that was pre-seeded by the compositor).
      x = Math.min(this.width, GROUND_GENERATION_CONSTRAINTS.minGapSize)
    }

    let currentHeight =
      this.resolveSeededGroundHeight(seededLeftColumn) ??
      randomInt(
        GROUND_GENERATION_CONSTRAINTS.minColumnHeightTiles,
        GROUND_GENERATION_CONSTRAINTS.maxColumnHeightTiles,
        this.random
      )
    let lastRunType: 'ground' | 'gap' | null = null
    if (seededLeftColumn) {
      lastRunType = seededHasGround ? 'ground' : 'gap'
    }

    while (x < this.width) {
      const remaining = this.width - x

      if (remaining < GROUND_GENERATION_CONSTRAINTS.minSegmentLength) {
        if (lastRunType === 'gap') {
          // Extend the previous gap so it cannot end up as a 1-column gap.
          break
        } else {
          // Extend current ground run so it cannot end up as a 1-column ground segment.
          for (let col = x; col < this.width; col += 1) {
            this.paintGroundColumn(tiles, col, currentHeight)
          }
          break
        }
      }

      const canPlaceGap =
        x >= GROUND_GENERATION_CONSTRAINTS.minimumStartingSolidColumns &&
        remaining >= GROUND_GENERATION_CONSTRAINTS.minGapSize
      const leavesRoomForGroundAfterGap =
        remaining - GROUND_GENERATION_CONSTRAINTS.minGapSize >=
        GROUND_GENERATION_CONSTRAINTS.minSegmentLength
      const canEndChunkWithValidGap =
        remaining >= GROUND_GENERATION_CONSTRAINTS.minGapSize &&
        remaining <= GROUND_GENERATION_CONSTRAINTS.maxGapSize
      const shouldPlaceGap =
        canPlaceGap &&
        (leavesRoomForGroundAfterGap || canEndChunkWithValidGap) &&
        this.random() < GROUND_GENERATION_CONSTRAINTS.gapChancePerSegment

      if (shouldPlaceGap) {
        const maxGapWidth = Math.min(
          GROUND_GENERATION_CONSTRAINTS.maxGapSize,
          remaining
        )
        const gapWidth = randomInt(
          GROUND_GENERATION_CONSTRAINTS.minGapSize,
          maxGapWidth,
          this.random
        )
        x += gapWidth
        lastRunType = 'gap'
        continue
      }

      const maxSegmentWidth = Math.min(
        GROUND_GENERATION_CONSTRAINTS.maxSegmentLength,
        remaining
      )
      const segmentLength = randomInt(
        GROUND_GENERATION_CONSTRAINTS.minSegmentLength,
        maxSegmentWidth,
        this.random
      )

      const nextHeight = this.buildNextHeight(currentHeight)

      for (let i = 0; i < segmentLength; i += 1) {
        const t = segmentLength === 1 ? 1 : i / (segmentLength - 1)
        const interpolatedHeight = Math.round(
          currentHeight + (nextHeight - currentHeight) * t
        )
        this.paintGroundColumn(tiles, x + i, interpolatedHeight)
      }

      x += segmentLength
      currentHeight = nextHeight
      lastRunType = 'ground'
    }
  }

  private buildNextHeight(currentHeight: number): number {
    const stepDelta = randomInt(
      0,
      GROUND_GENERATION_CONSTRAINTS.maxHeightStepDeltaRows,
      this.random
    )
    const direction = this.random() < 0.5 ? -1 : 1
    const next = currentHeight + stepDelta * direction

    return Math.max(
      GROUND_GENERATION_CONSTRAINTS.minColumnHeightTiles,
      Math.min(next, GROUND_GENERATION_CONSTRAINTS.maxColumnHeightTiles)
    )
  }

  private resolveSeededGroundHeight(
    seededLeftColumn: Tile[] | null
  ): number | null {
    if (!seededLeftColumn) {
      return null
    }

    let height = 0
    for (let row = this.height - 1; row >= 0; row -= 1) {
      if (seededLeftColumn[row] !== Tile.GROUND) {
        break
      }
      height += 1
    }

    if (height < GROUND_GENERATION_CONSTRAINTS.minColumnHeightTiles) {
      return null
    }

    return Math.min(height, GROUND_GENERATION_CONSTRAINTS.maxColumnHeightTiles)
  }

  private seededColumnHasGround(seededLeftColumn: Tile[] | null): boolean {
    if (!seededLeftColumn) {
      return false
    }

    for (const tile of seededLeftColumn) {
      if (tile === Tile.GROUND) {
        return true
      }
    }

    return false
  }

  private paintGroundColumn(
    tiles: Tile[][],
    column: number,
    heightTiles: number
  ): void {
    const clampedHeight = Math.max(
      GROUND_GENERATION_CONSTRAINTS.minColumnHeightTiles,
      Math.min(heightTiles, GROUND_GENERATION_CONSTRAINTS.maxColumnHeightTiles)
    )

    const startRow = this.height - clampedHeight
    for (let row = startRow; row < this.height; row += 1) {
      tiles[row][column] = Tile.GROUND
    }
  }

  private setGroundColumnHeight(
    tiles: Tile[][],
    column: number,
    heightTiles: number
  ): void {
    for (let row = 0; row < this.height; row += 1) {
      tiles[row][column] = Tile.EMPTY
    }

    if (heightTiles <= 0) {
      return
    }

    this.paintGroundColumn(tiles, column, heightTiles)
  }

  private normalizeNarrowGroundColumns(
    tiles: Tile[][],
    seededLeftColumn: Tile[] | null
  ): void {
    const hasGroundByColumn = Array.from({ length: this.width }, (_, col) =>
      this.columnHasGround(tiles, col)
    )

    // Remove 1-column gaps between two ground columns.
    for (let col = 1; col < this.width - 1; col += 1) {
      if (
        !hasGroundByColumn[col] &&
        hasGroundByColumn[col - 1] &&
        hasGroundByColumn[col + 1]
      ) {
        const leftHeight = this.getGroundHeightAtColumn(tiles, col - 1)
        const rightHeight = this.getGroundHeightAtColumn(tiles, col + 1)
        const fillHeight = Math.round((leftHeight + rightHeight) * 0.5)
        this.paintGroundColumn(tiles, col, fillHeight)
        hasGroundByColumn[col] = true
      }
    }

    // Expand 1-column islands to at least 2 columns when possible.
    for (let col = 0; col < this.width; col += 1) {
      if (!hasGroundByColumn[col]) {
        continue
      }

      const hasLeft = col > 0 ? hasGroundByColumn[col - 1] : false
      const hasRight = col < this.width - 1 ? hasGroundByColumn[col + 1] : false
      const seededContinuesLeft =
        col === 0 && this.seededColumnHasGround(seededLeftColumn)

      if (hasLeft || hasRight || seededContinuesLeft) {
        continue
      }

      const sourceHeight = this.getGroundHeightAtColumn(tiles, col)
      if (col < this.width - 1) {
        this.paintGroundColumn(tiles, col + 1, sourceHeight)
        hasGroundByColumn[col + 1] = true
        continue
      }

      if (col > 0) {
        this.paintGroundColumn(tiles, col - 1, sourceHeight)
        hasGroundByColumn[col - 1] = true
      }
    }
  }

  private columnHasGround(tiles: Tile[][], column: number): boolean {
    for (let row = 0; row < this.height; row += 1) {
      if (tiles[row][column] === Tile.GROUND) {
        return true
      }
    }

    return false
  }

  private getGroundHeightAtColumn(tiles: Tile[][], column: number): number {
    if (!this.columnHasGround(tiles, column)) {
      return 0
    }

    let height = 0

    for (let row = this.height - 1; row >= 0; row -= 1) {
      if (tiles[row][column] !== Tile.GROUND) {
        break
      }
      height += 1
    }

    return Math.max(
      GROUND_GENERATION_CONSTRAINTS.minColumnHeightTiles,
      Math.min(height, GROUND_GENERATION_CONSTRAINTS.maxColumnHeightTiles)
    )
  }

  private normalizeSingleColumnHeightRuns(
    tiles: Tile[][],
    seededLeftColumn: Tile[] | null
  ): void {
    const seededHeight = this.resolveSeededGroundHeight(seededLeftColumn) ?? 0

    // Two passes are enough to remove residual 1-column height spikes created
    // by interpolation while keeping broader slopes intact.
    for (let pass = 0; pass < 2; pass += 1) {
      const heights = Array.from({ length: this.width }, (_, col) =>
        this.getGroundHeightAtColumn(tiles, col)
      )
      let changed = false

      let col = 0
      while (col < this.width) {
        const runHeight = heights[col]
        const runStart = col

        while (col + 1 < this.width && heights[col + 1] === runHeight) {
          col += 1
        }

        const runEnd = col
        const runLength = runEnd - runStart + 1

        if (runHeight > 0 && runLength === 1) {
          const leftHeight = runStart > 0 ? heights[runStart - 1] : seededHeight
          const rightHeight = runEnd < this.width - 1 ? heights[runEnd + 1] : 0
          const continuesFromSeededLeft =
            runStart === 0 && seededHeight === runHeight && seededHeight > 0

          if (!continuesFromSeededLeft) {
            let targetHeight = runHeight

            if (leftHeight > 0 && rightHeight > 0) {
              targetHeight = Math.round((leftHeight + rightHeight) * 0.5)
            } else if (leftHeight > 0) {
              targetHeight = leftHeight
            } else if (rightHeight > 0) {
              targetHeight = rightHeight
            }

            targetHeight = Math.max(
              GROUND_GENERATION_CONSTRAINTS.minColumnHeightTiles,
              Math.min(
                targetHeight,
                GROUND_GENERATION_CONSTRAINTS.maxColumnHeightTiles
              )
            )

            if (targetHeight !== runHeight) {
              this.setGroundColumnHeight(tiles, runStart, targetHeight)
              changed = true
            }
          }
        }

        col += 1
      }

      if (!changed) {
        break
      }
    }
  }

  private buildTopStyleAssignments(
    tiles: Tile[][],
    seededLeftColumn: Tile[] | null
  ): void {
    const styles = Array.from({ length: this.width }, () => -1)
    const seededContinuesGround = this.seededColumnHasGround(seededLeftColumn)
    let col = 0

    while (col < this.width) {
      if (!this.columnHasGround(tiles, col)) {
        col += 1
        continue
      }

      const runStart = col
      while (col + 1 < this.width && this.columnHasGround(tiles, col + 1)) {
        col += 1
      }
      const runEnd = col

      const useCarryInStyle =
        runStart === 0 &&
        seededContinuesGround &&
        this.carryInOpenSectionStyleIndex !== null

      const styleIndex = useCarryInStyle
        ? this.carryInOpenSectionStyleIndex!
        : this.pickSectionStyleIndex(tiles, runStart, runEnd)

      for (let runCol = runStart; runCol <= runEnd; runCol += 1) {
        styles[runCol] = styleIndex
      }

      col += 1
    }

    this.topStyleByColumn = styles
    this.rightOpenSectionStyleIndex =
      styles[this.width - 1] >= 0 ? styles[this.width - 1] : null
  }

  private pickSectionStyleIndex(
    tiles: Tile[][],
    sectionStart: number,
    sectionEnd: number
  ): number {
    const anchorHeight = this.getGroundHeightAtColumn(tiles, sectionStart)
    const hash =
      (sectionStart * 73856093) ^
      (sectionEnd * 19349663) ^
      (anchorHeight * 83492791)
    return Math.abs(hash) % 2
  }
}
