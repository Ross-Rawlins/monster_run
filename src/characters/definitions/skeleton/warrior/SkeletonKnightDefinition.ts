import { CHARACTER_KEYS } from '../../../../config/keys'
import { SkeletonWarriorBaseDefinition } from '../../../base/SkeletonWarriorBaseDefinition'

export class SkeletonKnightDefinition extends SkeletonWarriorBaseDefinition {
  readonly id = CHARACTER_KEYS.SKELETON_WARRIOR_KNIGHT
  readonly label = 'Skeleton Knight'
  readonly sheetKey = 'skeleton-warrior-knight'
  readonly metadataKey = 'skeleton-warrior-knight-meta'
  readonly texturePath =
    'assets/characters/skeleton/warrior/knight/skeleton_warrior_knight.png'
  readonly metadataPath =
    'assets/characters/skeleton/warrior/knight/skeleton_warrior_knight.json'

  override get animations() {
    const base = super.animations
    const p = this.id
    return {
      ...base,
      run: {
        name: `${p}-run`,
        frames: [196, 197, 198, 199, 200, 201],
        frameRate: 16,
        repeat: -1,
      },
    }
  }
}

export const SKELETON_KNIGHT_DEFINITION = new SkeletonKnightDefinition()
