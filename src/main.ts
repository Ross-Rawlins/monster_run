import * as Phaser from 'phaser'
import BootScene from './scenes/BootScene'
import CharacterSandboxScene from './scenes/CharacterSandboxScene'
import InfiniteRunnerScene from './scenes/InfiniteRunnerScene'

declare global {
  var game: Phaser.Game | undefined
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 1280,
  height: 720,
  backgroundColor: '#171a25',
  pixelArt: true,
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
