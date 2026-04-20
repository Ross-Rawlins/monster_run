import * as Phaser from 'phaser'
import { resolveParallaxLayerConfigs } from '../config/parallax'
import { RUNNER_ASSET_KEYS } from '../config/keys'
import type { ParallaxLayer } from './parallax/types'

const PARALLAX_SEAM_OVERLAP_PX = 1

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
    const layerConfigs = resolveParallaxLayerConfigs(this.cameraHeight)

    layerConfigs.forEach((config, layerIndex) => {
      const frame = this.scene.textures.getFrame(
        RUNNER_ASSET_KEYS.BACKGROUND_ATLAS,
        config.frame
      )

      if (!frame) {
        throw new Error(`Missing background frame: ${config.frame}`)
      }

      const scale = config.stripHeight / frame.height
      const scaledWidth = Math.max(1, Math.round(frame.width * scale))
      const topY = Math.round(config.top)
      const scaledHeight = Math.max(
        1,
        Math.ceil(config.stripHeight) + PARALLAX_SEAM_OVERLAP_PX
      )
      const spriteCount = Math.ceil(this.cameraWidth / scaledWidth) + 3
      const sprites: Phaser.GameObjects.Image[] = []

      const imageBottom = topY + scaledHeight
      const fillBottomY =
        layerIndex < layerConfigs.length - 1
          ? Math.round(layerConfigs[layerIndex + 1].top)
          : this.cameraHeight

      const fillTopY = imageBottom - PARALLAX_SEAM_OVERLAP_PX
      const fillHeight = Math.max(0, Math.ceil(fillBottomY - fillTopY))
      const fillCenterY = fillTopY + fillHeight * 0.5

      const fill = this.scene.add
        .rectangle(
          this.cameraWidth * 0.5,
          fillCenterY,
          this.cameraWidth + 2,
          fillHeight,
          config.fillColor
        )
        .setDepth(config.fillDepth)
        .setScrollFactor(0)

      for (let index = 0; index < spriteCount; index += 1) {
        const xPos = index * scaledWidth
        const sprite = this.scene.add.image(
          xPos,
          topY,
          RUNNER_ASSET_KEYS.BACKGROUND_ATLAS,
          config.frame
        )

        sprite
          .setOrigin(0, 0)
          .setDisplaySize(scaledWidth, scaledHeight)
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
        sprite.x = Math.floor(index * layer.scaledWidth - offset)
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
