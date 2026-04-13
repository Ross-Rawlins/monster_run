/**
 * Standard constructor options for all terrain generators.
 *
 * All generators must accept exactly these options. Layer-specific data
 * (e.g., seededLeftColumn for seamless left-edge continuation) is passed
 * via GeneratorContext during the generate() call, not the constructor.
 */
export interface GeneratorOptions {
  /** Grid width in tiles. */
  width: number

  /** Grid height in tiles. */
  height: number

  /** Seeded random number generator returning [0, 1). */
  random: () => number
}
