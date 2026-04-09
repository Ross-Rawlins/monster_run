/// <reference lib="webworker" />

import type { WorkerMessage, WorkerResponse } from '../../types/tilemaps'
import { WFCGenerator } from './WFCGenerator'

const workerScope = self as DedicatedWorkerGlobalScope

function buildAttemptSeed(chunkIndex: number, attempt: number): number {
  return (chunkIndex + 1) * 2654435761 + attempt * 1013904223
}

workerScope.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { previousRightColumn, chunkIndex } = event.data

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

export {}
