export function pickWeighted<T>(
  items: readonly T[],
  getWeight: (item: T) => number,
  nextRandom: () => number = Math.random
): T {
  if (items.length === 0) {
    throw new Error('Cannot pick from an empty weighted list')
  }

  const totalWeight = items.reduce((total, item) => total + getWeight(item), 0)

  if (totalWeight <= 0) {
    throw new Error('Weighted list total must be greater than zero')
  }

  let roll = nextRandom() * totalWeight

  for (const item of items) {
    roll -= getWeight(item)

    if (roll <= 0) {
      return item
    }
  }

  return items[items.length - 1]
}