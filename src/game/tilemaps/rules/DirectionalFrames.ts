import { pickDeterministicVariant, type HorizontalRole } from './neighbors'

export interface HorizontalFrameSet {
  left: number
  middle: number[]
  right: number
  single?: number
}

export function resolveHorizontalFrame(
  frameSet: HorizontalFrameSet,
  horizontalRole: HorizontalRole,
  row: number,
  col: number,
  fallbackFrame: number,
  salt = 0
): number {
  if (horizontalRole === 'isolated') {
    return frameSet.single ?? frameSet.left
  }

  if (horizontalRole === 'left_edge') {
    return frameSet.left
  }

  if (horizontalRole === 'right_edge') {
    return frameSet.right ?? fallbackFrame
  }

  if (frameSet.middle.length === 0) {
    return fallbackFrame
  }

  return pickDeterministicVariant(frameSet.middle, row + salt, col)
}
