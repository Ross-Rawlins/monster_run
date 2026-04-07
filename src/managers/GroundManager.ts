import * as Phaser from 'phaser'
import { RUNNER_ASSET_KEYS } from '../config/keys'

interface GroundVariant {
  cropX: number
  cropY: number
  cropWidth: number
  cropHeight: number
}

/**
 * Recycles a small set of visible ground chunks ahead of the camera.
 * The collision remains independent; this manager is responsible for visuals.
 */
export class GroundManager {
  private readonly segments: Phaser.GameObjects.RenderTexture[] = []

  private readonly variants: GroundVariant[] = [
    { cropX: 0, cropY: 0, cropWidth: 64, cropHeight: 48 },
    { cropX: 48, cropY: 0, cropWidth: 64, cropHeight: 48 },
  ]

  private readonly segmentWidth = 256

  private readonly segmentScale = 4

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly cameraWidth: number,
    private readonly surfaceY: number
  ) {
    this.createSegments()
  }

  private createSegments(): void {
    const segmentCount = Math.ceil(this.cameraWidth / this.segmentWidth) + 3

    for (let index = 0; index < segmentCount; index += 1) {
      const variant = this.variants[index % this.variants.length]
      const segment = this.scene.add.renderTexture(
        index * this.segmentWidth,
        this.surfaceY,
        variant.cropWidth,
        variant.cropHeight
      )

      segment
        .setOrigin(0, 0)
        .drawFrame(
          RUNNER_ASSET_KEYS.TILES_ATLAS,
          'Tiles_Platforms_Grass.png',
          -variant.cropX,
          -variant.cropY
        )
        .setScale(this.segmentScale)
        .setDepth(5)

      this.segments.push(segment)
    }
  }

  public update(cameraX: number): void {
    const firstSegmentX =
      Math.floor(cameraX / this.segmentWidth) * this.segmentWidth -
      this.segmentWidth

    this.segments.forEach((segment, index) => {
      segment.x = firstSegmentX + index * this.segmentWidth
    })
  }

  public destroy(): void {
    this.segments.forEach((segment) => {
      segment.destroy()
    })
  }
}
