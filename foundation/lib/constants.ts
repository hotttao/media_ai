// ============ 生图平台常量 ============

/**
 * 支持的生图平台
 * - gpt: GPT 平台
 * - jimeng: 即梦平台
 */
export const GENERATION_PLATFORMS = ['gpt', 'jimeng'] as const

export type GenerationPlatform = typeof GENERATION_PLATFORMS[number]

export const DEFAULT_GENERATION_PLATFORM: GenerationPlatform = 'gpt'
