import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import path from 'path'
import fs from 'fs'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 图片服务基础 URL
const IMAGE_SERVICE_BASE_URL = process.env.NEXT_PUBLIC_IMAGE_SERVICE_BASE_URL || 'http://192.168.2.38'

// 本地 public 目录
const PUBLIC_UPLOADS_DIR = path.join(process.cwd(), 'public')

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
 * 获取媒体文件 URL - 本地优先，远程兜底
 * 1. 如果是完整 URL，直接返回
 * 2. 检查本地文件是否存在，存在则返回相对路径（浏览器会自动从当前域名加载）
 * 3. 不存在则返回图片服务完整 URL
 */
export function getMediaUrl(relativePath: string | null | undefined): string {
  if (!relativePath) return ''

  // 如果已经是完整 URL，直接返回
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath
  }

  // 检查本地文件是否存在
  const localFilePath = path.join(PUBLIC_UPLOADS_DIR, relativePath.replace(/^\//, ''))
  const existsLocally = fs.existsSync(localFilePath)

  if (existsLocally) {
    // 本地存在，返回相对路径（浏览器从当前域名加载）
    console.log(`[getMediaUrl] local: ${relativePath}`)
    return relativePath
  }

  // 本地不存在，返回图片服务完整 URL
  const fullUrl = `${IMAGE_SERVICE_BASE_URL}${relativePath}`
  console.log(`[getMediaUrl] remote: ${fullUrl}`)
  return fullUrl
}

/**
 * 获取图片服务基础 URL
 */
export function getImageServiceBaseUrl(): string {
  return IMAGE_SERVICE_BASE_URL
}
