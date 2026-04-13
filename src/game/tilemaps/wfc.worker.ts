/// <reference lib="webworker" />

import type { WorkerMessage, WorkerResponse } from '../../types/tilemaps'
import { WFCGenerator } from './WFCGenerator'

const workerScope = globalThis as unknown as DedicatedWorkerGlobalScope
const RUN_SEED = createRunSeed()

function createRunSeed(): number {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.getRandomValues === 'function'
  ) {
    const values = new Uint32Array(1)
    crypto.getRandomValues(values)
    return values[0] >>> 0
  }

  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0
}

function buildAttemptSeed(chunkIndex: number, attempt: number): number {
  const chunkSeed = Math.imul(chunkIndex + 1, 2654435761)
  const attemptSeed = Math.imul(attempt, 1013904223)
  return (RUN_SEED ^ chunkSeed ^ attemptSeed) >>> 0
}

workerScope.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const {
    previousRightColumn,
    previousLayerRightColumns,
    previousGroundOpenSectionStyleIndex,
    chunkIndex,
  } = event.data

  let attempts = 0
  let chunk: WorkerResponse['chunk']

  while (!chunk && attempts < 10) {
    attempts += 1

    try {
      const generator = new WFCGenerator({
        seed: buildAttemptSeed(chunkIndex, attempts),
      })

      if (previousRightColumn) {
        generator.seedLeftColumn(previousRightColumn)
      }

      if (previousLayerRightColumns) {
        generator.seedLayerLeftColumns(previousLayerRightColumns)
      }

      if (previousGroundOpenSectionStyleIndex !== undefined) {
        generator.seedGroundOpenSectionStyleIndex(
          previousGroundOpenSectionStyleIndex
        )
      }

      chunk = generator.generate()
    } catch {
      chunk = undefined
    }
  }

  const response: WorkerResponse = chunk
    ? { chunkIndex, attempts, chunk }
    : {
        chunkIndex,
        attempts,
        error: `Failed to generate chunk ${chunkIndex} after ${attempts} attempts`,
      }

  workerScope.postMessage(response)
}
