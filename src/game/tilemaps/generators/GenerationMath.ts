export function randomInt(
  min: number,
  max: number,
  random: () => number
): number {
  return Math.floor(random() * (max - min + 1)) + min
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function stepToward(
  current: number,
  target: number,
  maxStep: number
): number {
  if (current < target) {
    return Math.min(current + maxStep, target)
  }

  if (current > target) {
    return Math.max(current - maxStep, target)
  }

  return current
}

export function segmentDistance(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): number {
  if (endA < startB) {
    return startB - endA
  }

  if (endB < startA) {
    return startA - endB
  }

  return 0
}

export function rangeDistance(
  minA: number,
  maxA: number,
  minB: number,
  maxB: number
): number {
  if (maxA < minB) {
    return minB - maxA
  }

  if (maxB < minA) {
    return minA - maxB
  }

  return 0
}
