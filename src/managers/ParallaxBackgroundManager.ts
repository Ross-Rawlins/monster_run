import * as Phaser from 'phaser'
import { RUNNER_ASSET_KEYS } from '../config/keys'

interface LayerConfig {
  frame: string
  depth: number
  speed: number
  top: number
  stripHeight: number
  fillColor: number
  fillDepth: number
}

interface ParallaxLayer {
  config: LayerConfig
  fill: Phaser.GameObjects.Rectangle
  scaledWidth: number
  sprites: Phaser.GameObjects.Image[]
}

export class ParallaxBackgroundManager {
  private readonly layers: ParallaxLayer[] = []

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly cameraWidth: number,
    private readonly cameraHeight: number
  ) {
    this.createLayers()
  }

  private createLayers(): void {
    const gridHeight = this.cameraHeight / 14

    // Grid rows are 1-based in design notes:
    // - Clouds start at row 4 and occupy 2 rows
    // - Trees start at row 7 and occupy 2 rows
    // - Front foliage starts at row 9 and occupies 2 rows
    const cloudTop = gridHeight * 3
    const treeTop = gridHeight * 6
    const frontTop = gridHeight * 8
    const stripHeight = gridHeight * 2

    const layerConfigs: LayerConfig[] = [
      {
        frame: 'Tilemap_Background_Spooky_Back.png',
        depth: -10,
        speed: 0.1,
        top: cloudTop,
        stripHeight,
        fillColor: 0x3f7a7a,
        fillDepth: -30,
      },
      {
        frame: 'Tilemap_Background_Spooky_Mid.png',
        depth: -5,
        speed: 0.18,
        top: treeTop,
        stripHeight,
        fillColor: 0x3f5f6c,
        fillDepth: -15,
      },
      {
        frame: 'Tilemap_Background_Spooky_Front.png',
        depth: -2,
        speed: 0.4,
        top: frontTop,
        stripHeight,
        fillColor: 0x2d3e38,
        fillDepth: -8,
      },
    ]

    layerConfigs.forEach((config, layerIndex) => {
      const frame = this.scene.textures.getFrame(
        RUNNER_ASSET_KEYS.BACKGROUND_ATLAS,
        config.frame
      )

      if (!frame) {
        throw new Error(`Missing background frame: ${config.frame}`)
      }

      const scale = config.stripHeight / frame.height
      const scaledWidth = frame.width * scale
      const scaledHeight = config.stripHeight
      const spriteCount = Math.ceil(this.cameraWidth / scaledWidth) + 2
      const sprites: Phaser.GameObjects.Image[] = []

      // Image bottom is where the image strip ends
      const imageBottom = config.top + scaledHeight

      // Next layer's top (or viewport bottom for last layer)
      const fillBottomY =
        layerIndex < layerConfigs.length - 1
          ? layerConfigs[layerIndex + 1].top
          : this.cameraHeight

      // Fill only the gap between this image bottom and next layer top
      const fillHeight = Math.max(0, fillBottomY - imageBottom)
      const fillCenterY = imageBottom + fillHeight * 0.5

      const fill = this.scene.add
        .rectangle(
          this.cameraWidth * 0.5,
          fillCenterY,
          this.cameraWidth,
          fillHeight,
          config.fillColor
        )
        .setDepth(config.fillDepth)
        .setScrollFactor(0)

      for (let index = 0; index < spriteCount; index += 1) {
        const sprite = this.scene.add.image(
          scaledWidth * index + scaledWidth * 0.5,
          config.top,
          RUNNER_ASSET_KEYS.BACKGROUND_ATLAS,
          config.frame
        )

        sprite
          .setOrigin(0.5, 0)
          .setScale(scale)
          .setDepth(config.depth)
          .setScrollFactor(0)

        sprites.push(sprite)
      }

      this.layers.push({ config, fill, scaledWidth, sprites })
    })
  }

  public update(cameraX: number): void {
    this.layers.forEach((layer) => {
      const offset = Phaser.Math.Wrap(
        cameraX * layer.config.speed,
        0,
        layer.scaledWidth
      )

      layer.sprites.forEach((sprite, index) => {
        sprite.x = Math.round(
          index * layer.scaledWidth - offset + layer.scaledWidth * 0.5
        )
      })
    })
  }

  public destroy(): void {
    this.layers.forEach((layer) => {
      layer.fill.destroy()
      layer.sprites.forEach((sprite) => {
        sprite.destroy()
      })
    })
    this.layers.length = 0
  }
}
