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
    this.load.atlas(
      RUNNER_ASSET_KEYS.OBJECTS_ATLAS,
      'assets/objects.png',
      'assets/objects.json'
    )
    this.load.atlas(
      RUNNER_ASSET_KEYS.TORCH_ATLAS,
      'assets/torch.png',
      'assets/torch.json'
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

    const params = new URLSearchParams(globalThis.location.search)
    const requestedScene = params.get('scene')?.toLowerCase()
    const startSceneKey =
      requestedScene === 'sandbox'
        ? SCENE_KEYS.CHARACTER_SANDBOX
        : SCENE_KEYS.INFINITE_RUNNER

    this.scene.start(startSceneKey)
  }
}
