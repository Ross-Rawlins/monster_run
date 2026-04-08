import {
  TERRAIN_CHUNK_TEMPLATES,
  TerrainChunkTemplate,
} from './terrainChunkTemplates'
import { pickWeighted } from '../utils/weightedSelection'

export function pickTerrainTemplate(
  chunkIndex: number,
  nextRandom: () => number
): TerrainChunkTemplate {
  const eligible = TERRAIN_CHUNK_TEMPLATES.filter(
    (template) => chunkIndex >= template.minChunk && template.weight > 0
  )

  if (eligible.length === 0) {
    throw new Error(`No terrain template is eligible for chunk ${chunkIndex}`)
  }

  return pickWeighted(
    eligible,
    (template) => template.weight,
    nextRandom
  )
}
