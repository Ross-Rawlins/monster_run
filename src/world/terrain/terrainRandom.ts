export class TerrainRandom {
  private state = 0

  constructor(seed: number) {
    this.setSeed(seed)
  }

  public setSeed(seed: number): void {
    const normalizedSeed = Math.trunc(seed) >>> 0
    this.state = normalizedSeed === 0 ? 0x6d2b79f5 : normalizedSeed
  }

  public nextFloat(): number {
    this.state += 0x6d2b79f5
    let value = this.state

    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }

  public randomInt(min: number, max: number): number {
    if (max <= min) {
      return min
    }

    return min + Math.floor(this.nextFloat() * (max - min + 1))
  }

  public randomInRange(
    range: readonly [number, number] | undefined,
    fallback: readonly [number, number]
  ): number {
    const [min, max] = range ?? fallback
    return this.randomInt(min, max)
  }
}
