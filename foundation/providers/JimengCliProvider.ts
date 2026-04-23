// foundation/providers/JimengCliProvider.ts
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const execAsync = promisify(exec)

export interface JimengCliConfig {
  dreaminaPath?: string  // dreamina CLI 路径，默认为 'dreamina'
}

export interface JimengImageInput {
  imageUrl: string
  description?: string  // 可选描述，如 "@图片1 是人物'西门孝哥'"
}

export interface JimengCliResult {
  success: boolean
  outputPath?: string
  error?: string
}

export class JimengCliProvider {
  providerName = 'jimeng'
  private config: JimengCliConfig
  private tmpDir: string

  constructor(config: JimengCliConfig = {}) {
    this.config = {
      dreaminaPath: 'dreamina',
      ...config,
    }
    this.tmpDir = path.join(os.tmpdir(), 'jimeng-cli')
    // 确保临时目录存在
    if (!fs.existsSync(this.tmpDir)) {
      fs.mkdirSync(this.tmpDir, { recursive: true })
    }
  }

  /**
   * 下载图片到临时文件
   */
  private async downloadImage(url: string): Promise<string> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`)
    }
    const buffer = await response.arrayBuffer()
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
    const filepath = path.join(this.tmpDir, filename)
    fs.writeFileSync(filepath, Buffer.from(buffer))
    return filepath
  }

  /**
   * 双图编辑 - 使用 multimodal2video 命令
   * @param imageA 第一张图片URL
   * @param imageB 第二张图片URL
   * @param prompt 编辑描述
   * @param options 可选参数
   */
  async imageBlend(
    imageA: string,
    imageB: string,
    prompt: string,
    options: {
      duration?: number
      ratio?: string
      modelVersion?: string
      videoResolution?: string
    } = {}
  ): Promise<JimengCliResult> {
    try {
      // 下载图片到临时文件
      const [pathA, pathB] = await Promise.all([
        this.downloadImage(imageA),
        this.downloadImage(imageB),
      ])

      // 构建命令
      const args = [
        'multimodal2video',
        '--image', pathA,
        '--image', pathB,
        '--prompt', `"${prompt.replace(/"/g, '\\"')}"`,
      ]

      if (options.duration) {
        args.push('--duration', options.duration.toString())
      }
      if (options.ratio) {
        args.push('--ratio', options.ratio)
      }
      if (options.modelVersion) {
        args.push('--model_version', options.modelVersion)
      }
      if (options.videoResolution) {
        args.push('--video_resolution', options.videoResolution)
      }

      const command = `${this.config.dreaminaPath} ${args.join(' ')}`
      console.log('[JimengCli] Executing:', command)

      const { stdout, stderr } = await execAsync(command, { timeout: 600000 }) // 10分钟超时

      if (stderr && !stderr.includes('submit_id')) {
        console.warn('[JimengCli] stderr:', stderr)
      }

      // 解析 submit_id
      const submitIdMatch = stdout.match(/submit_id[=:\s]+([a-zA-Z0-9_-]+)/i)
        || stdout.match(/([a-f0-9]{32,})/)  // 常见的 UUID/长 ID 格式

      if (submitIdMatch) {
        const submitId = submitIdMatch[1]
        console.log('[JimengCli] Got submit_id:', submitId)

        // 轮询结果
        const result = await this.queryResult(submitId)
        return result
      }

      // 如果没有 submit_id，检查是否直接返回了结果路径
      const outputMatch = stdout.match(/output[=:\s]+([^\s]+)/i)
        || stdout.match(/([^\s]+\.(mp4|jpg|png))/i)

      if (outputMatch) {
        return { success: true, outputPath: outputMatch[1] }
      }

      return { success: false, error: 'No submit_id or output found in response' }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 图生视频
   */
  async image2video(
    imageUrl: string,
    prompt: string,
    options: {
      duration?: number
      ratio?: string
      modelVersion?: string
      videoResolution?: string
    } = {}
  ): Promise<JimengCliResult> {
    try {
      const imagePath = await this.downloadImage(imageUrl)

      const args = [
        'image2video',
        '--image', imagePath,
        '--prompt', `"${prompt.replace(/"/g, '\\"')}"`,
      ]

      if (options.duration) {
        args.push('--duration', options.duration.toString())
      }
      if (options.ratio) {
        args.push('--ratio', options.ratio)
      }
      if (options.modelVersion) {
        args.push('--model_version', options.modelVersion)
      }
      if (options.videoResolution) {
        args.push('--video_resolution', options.videoResolution)
      }

      const command = `${this.config.dreaminaPath} ${args.join(' ')}`
      console.log('[JimengCli] Executing:', command)

      const { stdout } = await execAsync(command, { timeout: 600000 })

      const submitIdMatch = stdout.match(/submit_id[=:\s]+([a-zA-Z0-9_-]+)/i)
        || stdout.match(/([a-f0-9]{32,})/)

      if (submitIdMatch) {
        const submitId = submitIdMatch[1]
        return await this.queryResult(submitId)
      }

      return { success: false, error: 'No submit_id found' }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 查询结果
   */
  async queryResult(submitId: string, downloadDir?: string): Promise<JimengCliResult> {
    try {
      const args = ['query_result', '--submit_id', submitId]
      if (downloadDir) {
        args.push('--download_dir', downloadDir)
      }

      const command = `${this.config.dreaminaPath} ${args.join(' ')}`
      console.log('[JimengCli] Querying:', command)

      // 轮询直到有结果（最多 30 分钟）
      const maxAttempts = 180  // 180 * 10s = 30分钟
      let lastOutput = ''

      for (let i = 0; i < maxAttempts; i++) {
        try {
          const { stdout } = await execAsync(command, { timeout: 30000 })

          if (stdout.includes('status=success') || stdout.includes('SUCCESS') || stdout.includes('completed')) {
            // 提取输出路径
            const outputMatch = stdout.match(/output[=:\s]+([^\s]+)/i)
              || stdout.match(/([^\s]+\.(mp4|jpg|png))/i)

            if (outputMatch) {
              return { success: true, outputPath: outputMatch[1] }
            }
            // 如果成功但没找到路径，可能还在处理
            if (stdout.includes('processing') || stdout.includes('PENDING')) {
              lastOutput = stdout
              await this.sleep(10000)
              continue
            }
            return { success: true }
          }

          if (stdout.includes('status=failed') || stdout.includes('FAILED')) {
            const errorMatch = stdout.match(/error[=:\s]+([^\n]+)/i)
            return { success: false, error: errorMatch?.[1] || 'Task failed' }
          }

          lastOutput = stdout
          await this.sleep(10000)  // 10秒后重试
        } catch (e) {
          // 查询可能超时，继续重试
          await this.sleep(10000)
        }
      }

      return { success: false, error: 'Timeout waiting for result' }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 列出任务
   */
  async listTasks(status?: 'success' | 'failed' | 'pending'): Promise<JimengCliResult> {
    try {
      const args = ['list_task']
      if (status) {
        args.push('--gen_status', status)
      }

      const command = `${this.config.dreaminaPath} ${args.join(' ')}`
      const { stdout } = await execAsync(command, { timeout: 30000 })

      return { success: true, outputPath: stdout }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// 导出单例
let jimengProvider: JimengCliProvider | null = null

export function getJimengProvider(): JimengCliProvider {
  if (!jimengProvider) {
    jimengProvider = new JimengCliProvider()
  }
  return jimengProvider
}
