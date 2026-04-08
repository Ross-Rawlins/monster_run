import { Scene } from 'phaser'
import { CharacterRegistry } from '../characters/CharacterRegistry'
import { registerCharacterAnimations } from '../characters/registerCharacterAnimations'
import { SCENE_KEYS, RUNNER_ASSET_KEYS } from '../config/keys'

export default class BootScene extends Scene {
  constructor() {
    super({ key: SCENE_KEYS.BOOT })
  }

  public preload(): void {
    // Character sprite sheets
    CharacterRegistry.getAll().forEach((definition) => {
      this.load.spritesheet(definition.sheetKey, definition.texturePath, {
        frameWidth: definition.frameWidth,
        frameHeight: definition.frameHeight,
      })
      this.load.json(definition.metadataKey, definition.metadataPath)
    })

    // Infinite runner assets
    this.load.atlas(
      RUNNER_ASSET_KEYS.BACKGROUND_ATLAS,
      'assets/background.png',
      'assets/background.json'
    )
    this.load.atlas(
      RUNNER_ASSET_KEYS.TILES_ATLAS,
      'assets/tiles.png',
      'assets/tiles.json'
    )
    // Individual 16×16 grass surface tiles (65 tiles in a single row)
    this.load.atlas(
      RUNNER_ASSET_KEYS.TILE_ATLAS_GRASS,
      'assets/tiles/Tilles_Platforms_Grass.png',
      'assets/tiles/Tilles_Platforms_Grass.json'
    )
    // Individual 16×16 ground fill tiles (149 tiles in a 2-column stack)
    this.load.atlas(
      RUNNER_ASSET_KEYS.TILE_ATLAS_GROUND,
      'assets/tiles/Tilles_Platforms_Ground.png',
      'assets/tiles/Tilles_Platforms_Ground.json'
    )
    this.load.atlas(
      RUNNER_ASSET_KEYS.OBJECTS_ATLAS,
      'assets/objects.png',
      'assets/objects.json'
    )
  }

  public create(): void {
    CharacterRegistry.getAll().forEach((definition) => {
      const metadata = this.cache.json.get(definition.metadataKey)

      if (!metadata) {
        throw new Error('Missing character metadata for ' + definition.id)
      }

      registerCharacterAnimations(this.anims, definition)
    })

    // Start the infinite runner scene
    this.scene.start(SCENE_KEYS.INFINITE_RUNNER)
  }
}
