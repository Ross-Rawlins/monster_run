# Phaser Character Sandbox

This repo now boots directly into a worker-driven Wave Function Collapse runner
prototype. Terrain generation happens off the main thread, chunks seam from the
previous chunk's right edge, and stale chunks are destroyed behind the camera.

## Usage

### Running in Development

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

## Current Runtime

- `src/main.ts` boots straight into `src/game/scenes/GameScene.ts`.
- `src/game/tilemaps/wfc.worker.ts` generates 20x60 chunks off the main thread.
- `src/game/tilemaps/WFCGenerator.ts` performs entropy-based collapse with BFS
  propagation.
- `src/game/tilemaps/ChunkManager.ts` requests, activates, and destroys chunks
  as the runner advances.

## Controls

- `Space`: jump

## Notes

- The current player is a simple Phaser rectangle so terrain generation and
  chunk lifecycle can be tuned in isolation.
- The project uses Vite-native module workers, not webpack.
