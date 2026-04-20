import type { GeneratorOptions } from '../../contracts/GeneratorOptions'
import { Tile } from '../../TileTypes'
import { isGroundInternalDebugCell } from '../ground/GroundInternalDebug'
import {
  OBJECT_AVAILABILITY_EMPTY,
  OBJECT_GENERATION_CONSTRAINTS,
} from './ObjectConfig'
import {
  OBJECT_RULES,
  type ObjectChunkSection,
  type ObjectPlacementSurface,
  type ObjectRuleDefinition,
  type GeneratedObjectPlacement,
} from './ObjectRules'

export interface ObjectGenerationResult {
  availabilityGrid: number[][]
  placements: GeneratedObjectPlacement[]
}

type SpiderCornerSurface =
  | 'ground_internal_corner_nw'
  | 'ground_internal_corner_ne'

const GROUND_SURFACE_VALUE = 6
const GROUND_INTERNAL_VALUE = 8
// Single per-chunk chance — spider webs are not rolled per corner cell
const SPIDER_WEB_CHUNK_CHANCE = 0.3

export class ObjectGenerator {
  private readonly width: number
  private readonly height: number
  private readonly random: () => number

  constructor(options: GeneratorOptions) {
    this.width = options.width
    this.height = options.height
    this.random = options.random
  }

  public generate(
    terrainTiles: ReadonlyArray<ReadonlyArray<Tile>>
  ): ObjectGenerationResult {
    const availability = Array.from({ length: this.height }, () =>
      Array.from({ length: this.width }, () => OBJECT_AVAILABILITY_EMPTY)
    )
    const placements: GeneratedObjectPlacement[] = []

    for (let row = 0; row < this.height; row += 1) {
      for (let col = 0; col < this.width; col += 1) {
        this.applyRulesAtCell(terrainTiles, availability, placements, row, col)
      }
    }

    this.ensureAtLeastOneSpiderWebPlacement(
      terrainTiles,
      availability,
      placements
    )

    return {
      availabilityGrid: availability,
      placements,
    }
  }

  private applyRulesAtCell(
    terrainTiles: ReadonlyArray<ReadonlyArray<Tile>>,
    availability: number[][],
    placements: GeneratedObjectPlacement[],
    row: number,
    col: number
  ): void {
    const section = this.getChunkSection(col)
    const isCornerCell =
      this.isGroundInternalNorthWestCornerAnchorCell(terrainTiles, row, col) ||
      this.isGroundInternalNorthEastCornerAnchorCell(terrainTiles, row, col)

    for (const rule of OBJECT_RULES) {
      if (isCornerCell && !this.isSpiderCornerRule(rule.surface)) {
        continue
      }

      // Spider webs are placed once per chunk in ensureAtLeastOneSpiderWebPlacement
      if (this.isSpiderCornerRule(rule.surface)) {
        continue
      }

      if (!this.ruleAppliesToSection(rule, section)) {
        continue
      }

      if (!this.surfaceMatches(terrainTiles, row, col, rule.surface)) {
        continue
      }

      if (!this.shouldApplyRule(rule.chance)) {
        continue
      }

      this.stampAvailability(availability, row, col, rule)
      this.createPlacementsForRule(terrainTiles, placements, row, col, rule)
    }
  }

  private createPlacementsForRule(
    terrainTiles: ReadonlyArray<ReadonlyArray<Tile>>,
    placements: GeneratedObjectPlacement[],
    row: number,
    col: number,
    rule: ObjectRuleDefinition
  ): void {
    if (!rule.frameIndexRange && !rule.frameIndices?.length) {
      return
    }

    let objectRow = row
    if (rule.surface === 'ground_top' || rule.surface === 'platform_top') {
      objectRow = row - rule.footprint.height
    } else if (rule.surface === 'platform_under') {
      objectRow = row + 1
    }

    if (objectRow < 0 || objectRow >= this.height) {
      return
    }

    if (
      this.isColRangeOccupied(placements, objectRow, col, rule.footprint.width)
    ) {
      return
    }

    if (
      rule.footprint.width > 1 &&
      !this.hasConsecutiveSurfaceAt(
        terrainTiles,
        row,
        col,
        rule.footprint.width,
        rule.surface
      )
    ) {
      return
    }

    if (this.shouldSkipForRandomGap(rule, placements, objectRow, col)) {
      return
    }

    const frameKey = this.pickFrameKey(
      terrainTiles,
      rule,
      placements,
      objectRow,
      col,
      row
    )
    if (!frameKey) {
      return
    }

    placements.push({
      row: objectRow,
      col,
      frameKey,
      animationKey: rule.animation?.key,
      renderDepth: rule.renderDepth,
      footprintWidth:
        rule.footprint.width > 1 ? rule.footprint.width : undefined,
    })
  }

  private shouldSkipForRandomGap(
    rule: ObjectRuleDefinition,
    placements: ReadonlyArray<GeneratedObjectPlacement>,
    row: number,
    col: number
  ): boolean {
    const gapRule = rule.randomGaps
    if (!gapRule) {
      return false
    }

    const hasAdjacentPlacement = this.hasAdjacentHorizontalPlacement(
      placements,
      row,
      col
    )

    if (hasAdjacentPlacement && this.random() < gapRule.adjacentChance) {
      return true
    }

    return this.random() < gapRule.baseChance
  }

  private hasAdjacentHorizontalPlacement(
    placements: ReadonlyArray<GeneratedObjectPlacement>,
    row: number,
    col: number
  ): boolean {
    for (const placement of placements) {
      if (placement.row !== row) {
        continue
      }

      if (Math.abs(placement.col - col) === 1) {
        return true
      }
    }

    return false
  }

  private hasConsecutiveSurfaceAt(
    terrainTiles: ReadonlyArray<ReadonlyArray<Tile>>,
    surfaceRow: number,
    col: number,
    width: number,
    surface: ObjectPlacementSurface
  ): boolean {
    for (let c = col; c < col + width; c += 1) {
      if (c >= this.width) {
        return false
      }

      if (!this.surfaceMatches(terrainTiles, surfaceRow, c, surface)) {
        return false
      }
    }

    return true
  }

  private isColRangeOccupied(
    placements: ReadonlyArray<GeneratedObjectPlacement>,
    row: number,
    col: number,
    width: number
  ): boolean {
    for (const placement of placements) {
      if (placement.row !== row) {
        continue
      }

      const placementWidth = placement.footprintWidth ?? 1
      const overlaps =
        col < placement.col + placementWidth && col + width > placement.col
      if (overlaps) {
        return true
      }
    }

    return false
  }

  private hasPlacementAt(
    placements: ReadonlyArray<GeneratedObjectPlacement>,
    row: number,
    col: number
  ): boolean {
    return this.isColRangeOccupied(placements, row, col, 1)
  }

  private isSpiderCornerRule(surface: ObjectPlacementSurface): boolean {
    return (
      surface === 'ground_internal_corner_nw' ||
      surface === 'ground_internal_corner_ne'
    )
  }

  private ensureAtLeastOneSpiderWebPlacement(
    terrainTiles: ReadonlyArray<ReadonlyArray<Tile>>,
    availability: number[][],
    placements: GeneratedObjectPlacement[]
  ): void {
    if (
      placements.some((placement) =>
        this.isSpiderWebFrameKey(placement.frameKey)
      )
    ) {
      return
    }

    const candidates: Array<{
      row: number
      col: number
      surface: SpiderCornerSurface
    }> = []

    for (let row = 0; row < this.height; row += 1) {
      for (let col = 0; col < this.width; col += 1) {
        if (
          this.isGroundInternalNorthWestCornerAnchorCell(terrainTiles, row, col)
        ) {
          candidates.push({ row, col, surface: 'ground_internal_corner_nw' })
        }

        if (
          this.isGroundInternalNorthEastCornerAnchorCell(terrainTiles, row, col)
        ) {
          candidates.push({ row, col, surface: 'ground_internal_corner_ne' })
        }
      }
    }

    const openCandidates = candidates.filter(
      (candidate) =>
        !this.hasPlacementAt(placements, candidate.row, candidate.col)
    )

    if (openCandidates.length === 0) {
      return
    }

    if (!this.shouldApplyRule(SPIDER_WEB_CHUNK_CHANCE)) {
      return
    }

    const candidate =
      openCandidates[this.randomInt(0, openCandidates.length - 1)]

    const rule = OBJECT_RULES.find(
      (entry) => entry.surface === candidate.surface
    )
    if (!rule) {
      return
    }

    const frameKey = this.pickFrameKey(
      terrainTiles,
      rule,
      placements,
      candidate.row,
      candidate.col,
      candidate.row
    )
    if (!frameKey) {
      return
    }

    placements.push({
      row: candidate.row,
      col: candidate.col,
      frameKey,
      animationKey: rule.animation?.key,
    })
    availability[candidate.row][candidate.col] = this.bumpAvailability(
      availability[candidate.row][candidate.col],
      1
    )
  }

  private isSpiderWebFrameKey(frameKey: string): boolean {
    const frameIndex = this.parseFrameIndex(frameKey)
    if (frameIndex === null) {
      return false
    }

    return [15, 16, 17, 18, 19, 20].includes(frameIndex)
  }

  private pickFrameKey(
    terrainTiles: ReadonlyArray<ReadonlyArray<Tile>>,
    rule: ObjectRuleDefinition,
    placements: ReadonlyArray<GeneratedObjectPlacement>,
    row: number,
    col: number,
    sourceRow: number
  ): string | null {
    if (!rule.frameIndexRange && !rule.frameIndices?.length) {
      return null
    }

    const candidates = this.getAllowedFrameIndicesForCell(
      terrainTiles,
      rule,
      placements,
      row,
      col,
      sourceRow
    )

    if (candidates.length === 0) {
      return null
    }

    const index = rule.deterministicFrameSelection
      ? candidates[this.stableIndexForCell(row, col, candidates.length)]
      : candidates[this.randomInt(0, candidates.length - 1)]

    const size = rule.atlasSize ?? '16x16'
    return `${size}/Objects_${size}_Seperated_${index}.png`
  }

  private stableIndexForCell(row: number, col: number, length: number): number {
    if (length <= 1) {
      return 0
    }

    const hash = row * 73856093 + col * 19349663
    const normalized = Math.abs(hash)
    return normalized % length
  }

  private getAllowedFrameIndicesForCell(
    terrainTiles: ReadonlyArray<ReadonlyArray<Tile>>,
    rule: ObjectRuleDefinition,
    placements: ReadonlyArray<GeneratedObjectPlacement>,
    row: number,
    col: number,
    sourceRow: number
  ): number[] {
    const frameCandidates = this.getRuleFrameCandidates(rule)
    if (frameCandidates.length === 0) {
      return []
    }

    const neighborIndices = this.getNeighborFrameIndices(placements, row, col)
    const allowed: number[] = []

    for (const index of frameCandidates) {
      const blocked = neighborIndices.some((neighborIndex) =>
        this.formsBlockedAdjacentPair(index, neighborIndex)
      )

      if (
        !blocked &&
        !this.isFrameBlockedBySurfaceEdgeRule(
          terrainTiles,
          rule,
          index,
          sourceRow,
          col
        )
      ) {
        allowed.push(index)
      }
    }

    return allowed
  }

  private getRuleFrameCandidates(rule: ObjectRuleDefinition): number[] {
    if (rule.frameIndices && rule.frameIndices.length > 0) {
      return [...rule.frameIndices]
    }

    if (!rule.frameIndexRange) {
      return []
    }

    const candidates: number[] = []
    for (
      let index = rule.frameIndexRange.min;
      index <= rule.frameIndexRange.max;
      index += 1
    ) {
      candidates.push(index)
    }

    return candidates
  }

  private getNeighborFrameIndices(
    placements: ReadonlyArray<GeneratedObjectPlacement>,
    row: number,
    col: number
  ): number[] {
    const indices: number[] = []

    for (const placement of placements) {
      if (placement.row !== row) {
        continue
      }

      if (Math.abs(placement.col - col) !== 1) {
        continue
      }

      const frameIndex = this.parseFrameIndex(placement.frameKey)
      if (frameIndex !== null) {
        indices.push(frameIndex)
      }
    }

    return indices
  }

  private parseFrameIndex(frameKey: string): number | null {
    const match = /_(\d+)\.png$/.exec(frameKey)
    if (!match) {
      return null
    }

    return Number.parseInt(match[1], 10)
  }

  private formsBlockedAdjacentPair(left: number, right: number): boolean {
    const inHighBand = this.inRange(left, 39, 50) && this.inRange(right, 39, 50)
    if (inHighBand) {
      return true
    }

    const inSpiderWebBand =
      this.inRange(left, 15, 20) && this.inRange(right, 15, 20)
    if (inSpiderWebBand) {
      return true
    }

    return this.inRange(left, 21, 24) && this.inRange(right, 21, 24)
  }

  private inRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max
  }

  private isFrameBlockedBySurfaceEdgeRule(
    terrainTiles: ReadonlyArray<ReadonlyArray<Tile>>,
    rule: ObjectRuleDefinition,
    frameIndex: number,
    sourceRow: number,
    col: number
  ): boolean {
    const isRestrictedFrame = this.inRange(frameIndex, 21, 24)
    if (!isRestrictedFrame) {
      return false
    }

    if (rule.surface !== 'ground_top' && rule.surface !== 'platform_top') {
      return false
    }

    const supportTile = terrainTiles[sourceRow]?.[col]
    if (supportTile === undefined) {
      return false
    }

    const isGroundSupport = supportTile === Tile.GROUND
    const isPlatformSupport = supportTile === Tile.PLATFORM
    if (!isGroundSupport && !isPlatformSupport) {
      return false
    }

    const leftTile = col > 0 ? terrainTiles[sourceRow][col - 1] : Tile.EMPTY
    const rightTile =
      col < this.width - 1 ? terrainTiles[sourceRow][col + 1] : Tile.EMPTY

    const isGroundEdge =
      isGroundSupport && (leftTile !== Tile.GROUND || rightTile !== Tile.GROUND)
    const isPlatformEdge =
      isPlatformSupport &&
      (leftTile !== Tile.PLATFORM || rightTile !== Tile.PLATFORM)

    return isGroundEdge || isPlatformEdge
  }

  private ruleAppliesToSection(
    rule: ObjectRuleDefinition,
    section: ObjectChunkSection
  ): boolean {
    if (rule.chunkSection === 'any') {
      return true
    }

    return rule.chunkSection === section
  }

  private surfaceMatches(
    terrainTiles: ReadonlyArray<ReadonlyArray<Tile>>,
    row: number,
    col: number,
    surface: ObjectPlacementSurface
  ): boolean {
    if (surface === 'ground_top') {
      return this.isGroundTopCell(terrainTiles, row, col)
    }

    if (surface === 'platform_top') {
      return this.isPlatformTopCell(terrainTiles, row, col)
    }

    if (surface === 'platform_under') {
      return this.isPlatformUnderCell(terrainTiles, row, col)
    }

    if (surface === 'ground_internal') {
      return this.isGroundInternalTopCell(terrainTiles, row, col)
    }

    if (surface === 'ground_internal_corner_nw') {
      return this.isGroundInternalNorthWestCornerAnchorCell(
        terrainTiles,
        row,
        col
      )
    }

    if (surface === 'ground_internal_corner_ne') {
      return this.isGroundInternalNorthEastCornerAnchorCell(
        terrainTiles,
        row,
        col
      )
    }

    return false
  }

  private stampAvailability(
    availability: number[][],
    row: number,
    col: number,
    rule: ObjectRuleDefinition
  ): void {
    const anchor = this.resolveAnchorCell(row, col, rule.surface)
    if (!anchor) {
      return
    }

    const { width, height } = rule.footprint
    const startRow = anchor.row - (height - 1)
    const startCol = anchor.col
    const endRow = startRow + height - 1
    const endCol = startCol + width - 1

    if (!this.isInsideBounds(startRow, startCol, endRow, endCol)) {
      return
    }

    for (let stampRow = startRow; stampRow <= endRow; stampRow += 1) {
      for (let stampCol = startCol; stampCol <= endCol; stampCol += 1) {
        availability[stampRow][stampCol] = this.bumpAvailability(
          availability[stampRow][stampCol],
          rule.slotsPerMatch
        )
      }
    }
  }

  private resolveAnchorCell(
    row: number,
    col: number,
    surface: ObjectPlacementSurface
  ): { row: number; col: number } | null {
    if (surface === 'ground_top' || surface === 'platform_top') {
      if (row <= 0) {
        return null
      }

      return { row: row - 1, col }
    }

    if (surface === 'platform_under') {
      if (row >= this.height - 1) {
        return null
      }

      return { row: row + 1, col }
    }

    return { row, col }
  }

  private isInsideBounds(
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number
  ): boolean {
    if (startRow < 0 || startCol < 0) {
      return false
    }

    if (endRow >= this.height || endCol >= this.width) {
      return false
    }

    return true
  }

  private bumpAvailability(current: number, increment: number): number {
    return Math.min(
      OBJECT_GENERATION_CONSTRAINTS.maxAvailabilitySlotsPerCell,
      current + increment
    )
  }

  private shouldApplyRule(chance: number): boolean {
    const scaledChance = Math.min(
      1,
      chance * OBJECT_GENERATION_CONSTRAINTS.densityMultiplier
    )
    return this.random() < scaledChance
  }

  private getChunkSection(col: number): ObjectChunkSection {
    const sectionWidth = this.width / 3

    if (col < sectionWidth) {
      return 'left'
    }

    if (col < sectionWidth * 2) {
      return 'middle'
    }

    return 'right'
  }

  private randomInt(min: number, max: number): number {
    if (max <= min) {
      return min
    }

    return min + Math.floor(this.random() * (max - min + 1))
  }

  private isGroundTopCell(
    terrainTiles: ReadonlyArray<ReadonlyArray<Tile>>,
    row: number,
    col: number
  ): boolean {
    if (row <= 0) {
      return false
    }

    if (terrainTiles[row][col] !== Tile.GROUND) {
      return false
    }

    return terrainTiles[row - 1][col] === Tile.EMPTY
  }

  private isPlatformTopCell(
    terrainTiles: ReadonlyArray<ReadonlyArray<Tile>>,
    row: number,
    col: number
  ): boolean {
    if (row <= 0) {
      return false
    }

    if (terrainTiles[row][col] !== Tile.PLATFORM) {
      return false
    }

    return terrainTiles[row - 1][col] === Tile.EMPTY
  }

  private isPlatformUnderCell(
    terrainTiles: ReadonlyArray<ReadonlyArray<Tile>>,
    row: number,
    col: number
  ): boolean {
    if (row >= this.height - 1) {
      return false
    }

    if (terrainTiles[row][col] !== Tile.PLATFORM) {
      return false
    }

    return terrainTiles[row + 1][col] === Tile.EMPTY
  }

  private isGroundInternalCandidate(
    terrainTiles: ReadonlyArray<ReadonlyArray<Tile>>,
    row: number,
    col: number
  ): boolean {
    if (terrainTiles[row][col] !== Tile.GROUND) {
      return false
    }

    return isGroundInternalDebugCell(terrainTiles as number[][], row, col)
  }

  private isGroundInternalTopCell(
    terrainTiles: ReadonlyArray<ReadonlyArray<Tile>>,
    row: number,
    col: number
  ): boolean {
    if (!this.isGroundInternalCandidate(terrainTiles, row, col)) {
      return false
    }

    if (row === 0) {
      return true
    }

    return !this.isGroundInternalCandidate(terrainTiles, row - 1, col)
  }

  private isGroundInternalNorthWestCornerAnchorCell(
    terrainTiles: ReadonlyArray<ReadonlyArray<Tile>>,
    row: number,
    col: number
  ): boolean {
    if (row <= 0 || col <= 0) {
      return false
    }

    const center = this.getGroundCompassValueAt(terrainTiles, row, col)
    if (center !== GROUND_INTERNAL_VALUE) {
      return false
    }

    const north = this.getGroundCompassValueAt(terrainTiles, row - 1, col)
    const west = this.getGroundCompassValueAt(terrainTiles, row, col - 1)

    return north === GROUND_SURFACE_VALUE && west === GROUND_SURFACE_VALUE
  }

  private isGroundInternalNorthEastCornerAnchorCell(
    terrainTiles: ReadonlyArray<ReadonlyArray<Tile>>,
    row: number,
    col: number
  ): boolean {
    if (row <= 0 || col >= this.width - 1) {
      return false
    }

    const center = this.getGroundCompassValueAt(terrainTiles, row, col)
    if (center !== GROUND_INTERNAL_VALUE) {
      return false
    }

    const north = this.getGroundCompassValueAt(terrainTiles, row - 1, col)
    const east = this.getGroundCompassValueAt(terrainTiles, row, col + 1)

    return north === GROUND_SURFACE_VALUE && east === GROUND_SURFACE_VALUE
  }

  private getGroundCompassValueAt(
    terrainTiles: ReadonlyArray<ReadonlyArray<Tile>>,
    row: number,
    col: number
  ): number {
    if (row < 0 || row >= this.height || col < 0 || col >= this.width) {
      return -1
    }

    const tile = terrainTiles[row][col]
    if (tile !== Tile.GROUND) {
      return tile
    }

    return this.isGroundInternalCandidate(terrainTiles, row, col)
      ? GROUND_INTERNAL_VALUE
      : GROUND_SURFACE_VALUE
  }
}
