// foundation/providers/CapcutCliProvider.ts
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const execAsync = promisify(exec)

export interface CapcutCliConfig {
  capcutPath?: string  // cap_cut CLI path, default 'cap_cut'
  outputBaseUrl?: string  // Video URL prefix for converting local paths
}

export interface CapcutClipInput {
  videoUrls: string[]   // AI video URL list
  musicUrl?: string     // Background music URL (optional)
}

export interface CapcutClipResult {
  success: boolean
  clips?: CapcutClip[]
  error?: string
}

export interface CapcutClipDryRunResult {
  count: number
  error?: string
}

export interface CapcutClip {
  template: string
  templateId: string
  url: string
  thumbnail: string
  params: Record<string, unknown>
  duration?: number
  size?: number
}

export class CapcutCliProvider {
  providerName = 'capcut'
  private config: CapcutCliConfig
  private tmpDir: string

  constructor(config: CapcutCliConfig = {}) {
    this.config = {
      capcutPath: 'cap_cut',
      outputBaseUrl: 'http://localhost:3000/videos',
      ...config,
    }
    this.tmpDir = path.join(os.tmpdir(), 'capcut-cli')
    if (!fs.existsSync(this.tmpDir)) {
      fs.mkdirSync(this.tmpDir, { recursive: true })
    }
  }

  /**
   * Download video to temporary file
   */
  private async downloadVideo(url: string): Promise<string> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`)
    }
    const buffer = await response.arrayBuffer()
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`
    const filepath = path.join(this.tmpDir, filename)
    fs.writeFileSync(filepath, Buffer.from(buffer))
    return filepath
  }

  /**
   * Download music to temporary file
   */
  private async downloadMusic(url: string): Promise<string> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to download music: ${response.statusText}`)
    }
    const buffer = await response.arrayBuffer()
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`
    const filepath = path.join(this.tmpDir, filename)
    fs.writeFileSync(filepath, Buffer.from(buffer))
    return filepath
  }

  /**
   * Cleanup temporary files
   */
  private cleanupFiles(paths: string[]): void {
    for (const p of paths) {
      try {
        fs.unlinkSync(p)
      } catch {
        // ignore errors during cleanup
      }
    }
  }

  /**
   * Execute cap_cut clip command
   */
  async clip(input: CapcutClipInput): Promise<CapcutClipResult> {
    const tempFiles: string[] = []
    try {
      // Download all videos to temp files
      const videoPaths = await Promise.all(
        input.videoUrls.map(url => this.downloadVideo(url))
      )
      tempFiles.push(...videoPaths)

      // Download music if provided
      let musicPath: string | undefined
      if (input.musicUrl) {
        musicPath = await this.downloadMusic(input.musicUrl)
        tempFiles.push(musicPath)
      }

      // Build command
      const args = [
        'clip',
        '--videos', videoPaths.join(','),
        '--output', this.tmpDir,
      ]

      if (musicPath) {
        args.push('--music', musicPath)
      }

      const command = `${this.config.capcutPath} ${args.join(' ')}`
      console.log('[CapcutCli] Executing:', command)

      // cap_cut may take a long time, set long timeout
      const { stdout, stderr } = await execAsync(command, { timeout: 600000 })

      if (stderr) {
        console.warn('[CapcutCli] stderr:', stderr)
      }

      // Parse JSON output
      const jsonMatch = stdout.match(/\{[\s\S]*"clips"[\s\S]*\}/)
      if (jsonMatch) {
        try {
          const result = JSON.parse(jsonMatch[0])
          // Convert local paths to URLs
          return {
            success: true,
            clips: result.clips?.map((clip: CapcutClip) => ({
              ...clip,
              url: this.convertToUrl(clip.url),
              thumbnail: this.convertToUrl(clip.thumbnail),
            })),
          }
        } catch {
          return { success: false, error: 'Failed to parse CLI output' }
        }
      }

      return { success: false, error: 'No JSON output found' }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    } finally {
      this.cleanupFiles(tempFiles)
    }
  }

  /**
   * Dry run clip command - returns the number of clips that would be generated
   */
  async clipDryRun(input: CapcutClipInput): Promise<{ count: number; error?: string }> {
    const tempFiles: string[] = []
    try {
      // Download all videos to temp files
      const videoPaths = await Promise.all(
        input.videoUrls.map(url => this.downloadVideo(url))
      )
      tempFiles.push(...videoPaths)

      // Download music if provided
      let musicPath: string | undefined
      if (input.musicUrl) {
        musicPath = await this.downloadMusic(input.musicUrl)
        tempFiles.push(musicPath)
      }

      // Build command with --dry-run flag
      const args = [
        'clip',
        '--dry-run',
        '--videos', videoPaths.join(','),
        '--output', this.tmpDir,
      ]

      if (musicPath) {
        args.push('--music', musicPath)
      }

      const command = `${this.config.capcutPath} ${args.join(' ')}`
      console.log('[CapcutCli] Dry run:', command)

      // cap_cut may take a long time, set long timeout
      const { stdout, stderr } = await execAsync(command, { timeout: 600000 })

      if (stderr) {
        console.warn('[CapcutCli] stderr:', stderr)
      }

      // Parse JSON output - dry run returns { "count": N }
      const jsonMatch = stdout.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          const result = JSON.parse(jsonMatch[0])
          return { count: result.count || 0 }
        } catch {
          return { count: 0, error: 'Failed to parse CLI output' }
        }
      }

      // Try to parse count from non-JSON output
      const countMatch = stdout.match(/count[:\s=]+(\d+)/i)
      if (countMatch) {
        return { count: parseInt(countMatch[1], 10) }
      }

      return { count: 0, error: 'No count found in output' }
    } catch (error) {
      return {
        count: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    } finally {
      this.cleanupFiles(tempFiles)
    }
  }

  /**
   * Convert local path to accessible URL
   */
  private convertToUrl(localPath: string): string {
    // Remove local path prefix, replace with URL prefix
    const relativePath = localPath.replace(/^[A-Z]:\\|^\//, '')
    return `${this.config.outputBaseUrl}/${relativePath}`
  }
}

// Export singleton
let capcutProvider: CapcutCliProvider | null = null

export function getCapcutProvider(): CapcutCliProvider {
  if (!capcutProvider) {
    capcutProvider = new CapcutCliProvider()
  }
  return capcutProvider
}
