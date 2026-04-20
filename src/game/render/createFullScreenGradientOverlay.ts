import * as Phaser from 'phaser'
import { FULL_SCREEN_LIGHTING_OVERLAY_CONFIG } from '../../config/lightingOverlay'

export interface FullScreenGradientOverlayConfig {
  topColor: number
  bottomColor: number
  topAlpha: number
  bottomAlpha: number
  depth: number
}

export interface FullScreenGradientOverlayHandle {
  overlay: Phaser.GameObjects.Graphics
  setDebugGuideVisible(visible: boolean): void
  isDebugGuideVisible(): boolean
  destroy(): void
}

const DEFAULT_OVERLAY_CONFIG = FULL_SCREEN_LIGHTING_OVERLAY_CONFIG

function createDebugGuide(
  scene: Phaser.Scene,
  width: number,
  height: number,
  config: FullScreenGradientOverlayConfig
): Phaser.GameObjects.Container {
  const guideHeight = Math.min(220, Math.max(180, Math.round(height * 0.3)))
  const guideWidth = 156
  const previewHeight = guideHeight - 54
  const previewWidth = 24
  const previewX = 14
  const previewY = 28
  const labelX = 50
  const lineColor = 0x8fb0d9
  const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: 'monospace',
    fontSize: '10px',
    color: '#dce6ff',
  }

  const guide = scene.add
    .container(width - guideWidth - 16, 16)
    .setScrollFactor(0)
    .setDepth(config.depth + 1)
    .setVisible(false)

  const panel = scene.add.rectangle(
    0,
    0,
    guideWidth,
    guideHeight,
    0x09111b,
    0.92
  )
  panel.setOrigin(0, 0)

  const previewBackground = scene.add.rectangle(
    previewX,
    previewY,
    previewWidth,
    previewHeight,
    0xffffff,
    1
  )
  previewBackground.setOrigin(0, 0)

  const previewOverlay = scene.add.graphics()
  previewOverlay.fillGradientStyle(
    config.topColor,
    config.topColor,
    config.bottomColor,
    config.bottomColor,
    config.topAlpha,
    config.topAlpha,
    config.bottomAlpha,
    config.bottomAlpha
  )
  previewOverlay.fillRect(previewX, previewY, previewWidth, previewHeight)

  const guideLines = scene.add.graphics()
  guideLines.lineStyle(1, lineColor, 0.8)
  guideLines.strokeRect(
    previewX - 1,
    previewY - 1,
    previewWidth + 2,
    previewHeight + 2
  )
  ;[0, 1].forEach((progress) => {
    const lineY = previewY + previewHeight * progress
    guideLines.lineBetween(
      previewX + previewWidth + 6,
      lineY,
      labelX - 4,
      lineY
    )
  })

  const title = scene.add.text(previewX, 8, 'Gradient Guide', {
    fontFamily: 'monospace',
    fontSize: '11px',
    color: '#ffffff',
  })

  const topLabel = scene.add.text(
    labelX,
    previewY - 6,
    `Top ${Math.round(config.topAlpha * 100)}%`,
    textStyle
  )
  topLabel.setOrigin(0, 0.5)

  const bottomLabel = scene.add.text(
    labelX,
    previewY + previewHeight,
    `Bottom ${Math.round(config.bottomAlpha * 100)}%`,
    textStyle
  )
  bottomLabel.setOrigin(0, 0.5)

  const hint = scene.add.text(
    previewX,
    guideHeight - 18,
    'Covers full canvas',
    textStyle
  )

  guide.add([
    panel,
    previewBackground,
    previewOverlay,
    guideLines,
    title,
    topLabel,
    bottomLabel,
    hint,
  ])

  return guide
}

export function createFullScreenGradientOverlay(
  scene: Phaser.Scene,
  width: number,
  height: number,
  config: Partial<FullScreenGradientOverlayConfig> = {}
): FullScreenGradientOverlayHandle {
  const resolvedConfig = { ...DEFAULT_OVERLAY_CONFIG, ...config }
  const overlay = scene.add.graphics()
  const debugGuide = createDebugGuide(scene, width, height, resolvedConfig)

  overlay.fillGradientStyle(
    resolvedConfig.topColor,
    resolvedConfig.topColor,
    resolvedConfig.bottomColor,
    resolvedConfig.bottomColor,
    resolvedConfig.topAlpha,
    resolvedConfig.topAlpha,
    resolvedConfig.bottomAlpha,
    resolvedConfig.bottomAlpha
  )
  overlay.fillRect(0, 0, width, height)

  overlay.setScrollFactor(0).setDepth(resolvedConfig.depth)

  return {
    overlay,
    setDebugGuideVisible: (visible: boolean) => {
      debugGuide.setVisible(visible)
    },
    isDebugGuideVisible: () => debugGuide.visible,
    destroy: () => {
      debugGuide.destroy(true)
      overlay.destroy()
    },
  }
}
