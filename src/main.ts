import * as Phaser from 'phaser'
import { INFINITE_RUNNER_COLORS } from './config/colors'
import GameScene from './game/scenes/GameScene'

declare global {
  var game: Phaser.Game | undefined
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: INFINITE_RUNNER_COLORS.base,
  pixelArt: true,
  render: {
    antialias: false,
    antialiasGL: false,
    pixelArt: true,
    roundPixels: true,
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: '100%',
    height: '100%',
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 1200 },
      debug: false,
    },
  },
  scene: [GameScene],
}

const game = new Phaser.Game(config)
globalThis.game = game
