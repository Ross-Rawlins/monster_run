import type * as Phaser from 'phaser'

export interface ParallaxLayerBandConfig {
  frame: string
  depth: number
  speed: number
  rowStart: number
  rowSpan: number
  fillColor: number
  fillDepth: number
}

export interface ResolvedParallaxLayerConfig {
  frame: string
  depth: number
  speed: number
  top: number
  stripHeight: number
  fillColor: number
  fillDepth: number
}

export interface ParallaxLayer {
  config: ResolvedParallaxLayerConfig
  fill: Phaser.GameObjects.Rectangle
  scaledWidth: number
  sprites: Phaser.GameObjects.Image[]
}
