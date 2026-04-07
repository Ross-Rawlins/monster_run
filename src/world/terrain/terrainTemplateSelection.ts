import {
  TERRAIN_CHUNK_TEMPLATES,
  TerrainChunkTemplate,
} from './terrainChunkTemplates'

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

  const totalWeight = eligible.reduce(
    (total, template) => total + template.weight,
    0
  )
  let roll = nextRandom() * totalWeight

  for (const template of eligible) {
    roll -= template.weight

    if (roll <= 0) {
      return template
    }
  }

  return eligible[eligible.length - 1]
}
