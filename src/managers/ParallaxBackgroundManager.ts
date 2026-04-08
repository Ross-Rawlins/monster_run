import * as Phaser from 'phaser'
import { INFINITE_RUNNER_COLORS } from '../config/colors'
import { RUNNER_ASSET_KEYS } from '../config/keys'

interface LayerConfig {
  frame: string
  depth: number
  speed: number
  top: number
  stripHeight: number
  cropTop: number
  cropBottom: number
  fillColor: number
  fillDepth: number
}

interface ParallaxLayer {
  config: LayerConfig
  fill: Phaser.GameObjects.Rectangle
  seamCovers: Phaser.GameObjects.Rectangle[]
  scaledWidth: number
  sprites: Phaser.GameObjects.Image[]
}

export class ParallaxBackgroundManager {
  private readonly layers: ParallaxLayer[] = []

  private topGapFill: Phaser.GameObjects.Rectangle | null = null

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly cameraWidth: number,
    private readonly tileRendered: number
  ) {
    this.createLayers()
  }

  private createLayers(): void {
    // Each strip is 2 grid blocks tall and can be positioned lower for composition.
    const stripHeight = this.tileRendered * 2
    const seamOverlap = 2

    const layerConfigs: LayerConfig[] = [
      {
        frame: 'Tilemap_Background_Spooky_Back.png',
        depth: -10,
        speed: 0.1,
        top: this.tileRendered * 2, // Keep clouds lower and fill the top band separately
        stripHeight,
        cropTop: 0,
        cropBottom: 2,
        fillColor: INFINITE_RUNNER_COLORS.secondBand,
        fillDepth: -30,
      },
      {
        frame: 'Tilemap_Background_Spooky_Mid.png',
        depth: -5,
        speed: 0.18,
        top: this.tileRendered * 7, // Positioned from top
        stripHeight,
        cropTop: 0,
        cropBottom: 2,
        fillColor: INFINITE_RUNNER_COLORS.thirdBand,
        fillDepth: 0,
      },
      {
        frame: 'Tilemap_Background_Spooky_Front.png',
        depth: 0,
        speed: 0.4,
        top: this.tileRendered * 12,
        stripHeight,
        cropTop: 0,
        cropBottom: 2,
        fillColor: INFINITE_RUNNER_COLORS.forthBand,
        fillDepth: -8,
      },
    ]

    const topGapHeight = Math.max(0, layerConfigs[0]?.top ?? 0)
    if (topGapHeight > 0) {
      this.topGapFill = this.scene.add
        .rectangle(
          Math.round(this.cameraWidth * 0.5),
          Math.round((topGapHeight + seamOverlap) * 0.5),
          this.cameraWidth,
          topGapHeight + seamOverlap,
          INFINITE_RUNNER_COLORS.firstBand
        )
        .setDepth(-40)
        .setScrollFactor(0)
    }

    layerConfigs.forEach((config, layerIndex) => {
      const frame = this.scene.textures.getFrame(
        RUNNER_ASSET_KEYS.BACKGROUND_ATLAS,
        config.frame
      )

      if (!frame) {
        throw new Error(`Missing background frame: ${config.frame}`)
      }

      const croppedSourceHeight =
        frame.height - config.cropTop - config.cropBottom

      if (croppedSourceHeight <= 0) {
        throw new Error(
          `Invalid crop values for background frame: ${config.frame}`
        )
      }

      const scale = config.stripHeight / croppedSourceHeight
      const scaledWidth = Math.max(1, Math.round(frame.width * scale))
      const scaledHeight = config.stripHeight
      const seamCoverHeight = Math.max(4, Math.ceil(scale) + 2)
      const spriteCount = Math.ceil(this.cameraWidth / scaledWidth) + 2
      const sprites: Phaser.GameObjects.Image[] = []
      const seamCovers: Phaser.GameObjects.Rectangle[] = []

      // Image bottom is where the image strip ends
      const imageBottom = config.top + scaledHeight

      // Next layer's top (or viewport bottom for last layer)
      const fillBottomY =
        layerIndex < layerConfigs.length - 1
          ? layerConfigs[layerIndex + 1].top
          : this.scene.scale.height

      // Fill only the gap between this image bottom and next layer top
      const fillHeight = Math.max(
        0,
        fillBottomY - imageBottom + seamOverlap * 2
      )
      const fillCenterY = Math.round(
        imageBottom - seamOverlap + fillHeight * 0.5
      )

      const fill = this.scene.add
        .rectangle(
          Math.round(this.cameraWidth * 0.5),
          fillCenterY,
          this.cameraWidth,
          fillHeight,
          config.fillColor
        )
        .setDepth(config.fillDepth)
        .setScrollFactor(0)

      const colorAboveStrip =
        layerIndex === 0
          ? INFINITE_RUNNER_COLORS.firstBand
          : layerConfigs[layerIndex - 1].fillColor

      // Mask baked 1px source lines at strip boundaries so transitions remain clean.
      const topSeamCover = this.scene.add
        .rectangle(
          Math.round(this.cameraWidth * 0.5),
          Math.round(config.top + seamCoverHeight * 0.5),
          this.cameraWidth,
          seamCoverHeight,
          colorAboveStrip
        )
        .setDepth(config.depth + 0.5)
        .setScrollFactor(0)

      const bottomSeamCover = this.scene.add
        .rectangle(
          Math.round(this.cameraWidth * 0.5),
          Math.round(imageBottom - seamCoverHeight * 0.5),
          this.cameraWidth,
          seamCoverHeight,
          config.fillColor
        )
        .setDepth(config.depth + 0.5)
        .setScrollFactor(0)

      seamCovers.push(topSeamCover, bottomSeamCover)

      for (let index = 0; index < spriteCount; index += 1) {
        const spriteX = Math.round(scaledWidth * index)
        const sprite = this.scene.add.image(
          spriteX,
          Math.round(config.top - seamOverlap),
          RUNNER_ASSET_KEYS.BACKGROUND_ATLAS,
          config.frame
        )

        sprite
          .setOrigin(0, 0) // Left-align strips to avoid sub-pixel seam drift between neighbors
          .setCrop(0, config.cropTop, frame.width, croppedSourceHeight)
          .setScale(scale)
          .setDepth(config.depth)
          .setScrollFactor(0)

        sprites.push(sprite)
      }

      this.layers.push({ config, fill, seamCovers, scaledWidth, sprites })
    })
  }

  public update(cameraX: number): void {
    this.layers.forEach((layer) => {
      const offset = Phaser.Math.Wrap(
        cameraX * layer.config.speed,
        0,
        layer.scaledWidth
      )

      // Anchor first strip and derive all others from it to avoid 1px gaps from independent rounding.
      let firstX = -offset
      if (firstX > 0) {
        firstX -= layer.scaledWidth
      }

      layer.sprites.forEach((sprite, index) => {
        sprite.x = Math.round(firstX + index * layer.scaledWidth)
      })
    })
  }

  public destroy(): void {
    this.topGapFill?.destroy()
    this.topGapFill = null

    this.layers.forEach((layer) => {
      layer.seamCovers.forEach((cover) => {
        cover.destroy()
      })
      layer.fill.destroy()
      layer.sprites.forEach((sprite) => {
        sprite.destroy()
      })
    })
    this.layers.length = 0
  }
}
