export const SCENE_KEYS = Object.freeze({
  BOOT: 'BOOT_SCENE',
  CHARACTER_SANDBOX: 'CHARACTER_SANDBOX_SCENE',
  // Keep compatibility with current runner scene key.
  INFINITE_RUNNER: 'GAME_SCENE',
})

export const RUNNER_ASSET_KEYS = Object.freeze({
  BACKGROUND_ATLAS: 'background-atlas',
  BACKGROUND_ATLAS_JSON: 'background-atlas-json',
  TILES_ATLAS: 'tiles-atlas',
  TILES_ATLAS_JSON: 'tiles-atlas-json',
  OBJECTS_ATLAS: 'objects-atlas',
  OBJECTS_ATLAS_JSON: 'objects-atlas-json',
})

export const CHARACTER_KEYS = Object.freeze({
  // Knight
  KNIGHT: 'knight',
  // Skeleton Warriors
  SKELETON_WARRIOR_DEFAULT: 'skeleton-warrior-default',
  SKELETON_WARRIOR_KNIGHT: 'skeleton-warrior-knight',
  SKELETON_WARRIOR_PIRATE: 'skeleton-warrior-pirate',
  SKELETON_WARRIOR_VIKING: 'skeleton-warrior-viking',
  // Skeleton Mages
  SKELETON_MAGE_DEFAULT: 'skeleton-mage-default',
  SKELETON_MAGE_HOODED: 'skeleton-mage-hooded',
  SKELETON_MAGE_SORCERER: 'skeleton-mage-sorcerer',
  SKELETON_MAGE_WIZARD: 'skeleton-mage-wizard',
  // Zombies
  ZOMBIE_DEFAULT: 'zombie-default',
  ZOMBIE_BEANIE: 'zombie-beanie',
  ZOMBIE_BRAIN: 'zombie-brain',
  ZOMBIE_CAP: 'zombie-cap',
  ZOMBIE_COWBOY: 'zombie-cowboy',
  ZOMBIE_GLASSES: 'zombie-glasses',
  ZOMBIE_GUARD: 'zombie-guard',
  ZOMBIE_HAIR1: 'zombie-hair1',
  ZOMBIE_HAIR2: 'zombie-hair2',
  ZOMBIE_HAIR3: 'zombie-hair3',
  ZOMBIE_HAIR4: 'zombie-hair4',
  ZOMBIE_HAIR5: 'zombie-hair5',
  ZOMBIE_MUSHROOM: 'zombie-mushroom',
  ZOMBIE_PIRATE: 'zombie-pirate',
  ZOMBIE_SCUBA: 'zombie-scuba',
  ZOMBIE_SOLDIER: 'zombie-soldier',
  ZOMBIE_STAR: 'zombie-star',
  ZOMBIE_TOPHAT: 'zombie-tophat',
  ZOMBIE_TOQUE: 'zombie-toque',
  ZOMBIE_VIKING: 'zombie-viking',
})

export type CharacterId = (typeof CHARACTER_KEYS)[keyof typeof CHARACTER_KEYS]

/**
 * Atlas frame keys loaded from public/assets/tiles/tiles.json.
 * Each key matches the 'filename' field in the TexturePacker JSON.
 * These cover background parallax layers, foreground tileset, and decoration.
 */
export const TILE_KEYS = Object.freeze({
  ATLAS: 'tiles',
  ATLAS_JSON: 'tiles-json',
  // Background parallax bands
  BG_BACK: 'Background/BGBack.png',
  BG_FRONT: 'Background/BGFront.png',
  CLOUDS_BACK: 'Background/CloudsBack.png',
  CLOUDS_FRONT: 'Background/CloudsFront.png',
  // Foreground / platform art
  TILESET: 'Foreground/Tileset.png',
  TILES_EXAMPLES: 'Foreground/TilesExamples.png',
  TREES: 'Foreground/Trees.png',
  MOCKUP: 'Mockup.png',
})
