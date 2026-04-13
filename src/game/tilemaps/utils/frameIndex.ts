/**
 * Convert 1-based atlas tile number to 0-based frame index.
 * Atlas tiles in Phaser are 1-based, but frame indices are 0-based.
 *
 * @example
 * toFrameIndex(1) => 0  // First tile in atlas
 * toFrameIndex(5) => 4  // Fifth tile in atlas
 */
export function toFrameIndex(atlasTileNumber: number): number {
  return atlasTileNumber - 1
}
