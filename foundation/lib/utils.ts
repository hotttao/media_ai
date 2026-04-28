import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 图片服务基础 URL
const IMAGE_SERVICE_BASE_URL = process.env.NEXT_PUBLIC_IMAGE_SERVICE_BASE_URL || 'http://192.168.2.38'

/**
 * 获取完整的图片 URL
 * 如果已经是完整 URL 则直接返回
 */
export function getImageUrl(path: string | null | undefined): string {
  if (!path) return ''

  // 如果已经是完整 URL，直接返回
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  // 添加图片服务前缀
  return `${IMAGE_SERVICE_BASE_URL}${path}`
}

/**
 * 获取图片服务基础 URL
 */
export function getImageServiceBaseUrl(): string {
  return IMAGE_SERVICE_BASE_URL
}
