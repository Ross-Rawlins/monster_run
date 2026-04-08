import type { TerrainBiome } from './types/terrainTemplateTypes'
import type { TerrainBiomeFrameMap } from './types/terrainTileRuleTypes'

export const TERRAIN_BIOME_FRAMES: Record<TerrainBiome, TerrainBiomeFrameMap> =
  {
    graveyard: {
      surfaceSingle: ['Tiles_Ground_Seperated_21.png'],
      surfaceLeft: [
        'Tiles_Ground_Seperated_17.png',
        'Tiles_Ground_Seperated_21.png',
      ],
      surfaceMid: [
        'Tiles_Ground_Seperated_18.png',
        'Tiles_Ground_Seperated_19.png',
        'Tiles_Ground_Seperated_22.png',
        'Tiles_Ground_Seperated_23.png',
      ],
      surfaceRight: [
        'Tiles_Ground_Seperated_20.png',
        'Tiles_Ground_Seperated_24.png',
      ],
      wallLeft: [
        'Tiles_Ground_Seperated_25.png',
        'Tiles_Ground_Seperated_29.png',
      ],
      wallRight: [
        'Tiles_Ground_Seperated_28.png',
        'Tiles_Ground_Seperated_32.png',
      ],
      fill: [
        'Tiles_Ground_Seperated_29.png',
        'Tiles_Ground_Seperated_30.png',
        'Tiles_Ground_Seperated_31.png',
        'Tiles_Ground_Seperated_32.png',
        'Tiles_Ground_Seperated_33.png',
        'Tiles_Ground_Seperated_34.png',
        'Tiles_Ground_Seperated_35.png',
        'Tiles_Ground_Seperated_36.png',
      ],
      undersideLeft: [
        'Tiles_Ground_Seperated_74.png',
        'Tiles_Ground_Seperated_77.png',
      ],
      undersideMid: [
        'Tiles_Ground_Seperated_79.png',
        'Tiles_Ground_Seperated_80.png',
      ],
      undersideRight: [
        'Tiles_Ground_Seperated_81.png',
        'Tiles_Ground_Seperated_78.png',
      ],
    },
  }