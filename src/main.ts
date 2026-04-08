import * as Phaser from 'phaser'
import { INFINITE_RUNNER_COLORS } from './config/colors'
import BootScene from './scenes/BootScene'
import CharacterSandboxScene from './scenes/CharacterSandboxScene'
import InfiniteRunnerScene from './scenes/InfiniteRunnerScene'

declare global {
  var game: Phaser.Game | undefined
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 960,
  height: 580, // Changed from 576 to 580 to divide evenly by 20 (580 / 20 = 29px blocks)
  backgroundColor: INFINITE_RUNNER_COLORS.base,
  pixelArt: true,
  render: {
    antialias: false,
    antialiasGL: false,
    pixelArt: true,
    roundPixels: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 1200 },
      debug: false,
    },
  },
  scene: [BootScene, CharacterSandboxScene, InfiniteRunnerScene],
}

const game = new Phaser.Game(config)
globalThis.game = game
