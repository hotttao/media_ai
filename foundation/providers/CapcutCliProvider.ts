// foundation/providers/CapcutCliProvider.ts
import crypto from 'crypto'
import { exec, spawn } from 'child_process'
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

export interface CapcutClipInputAsync {
  videoUrls: string[]   // AI video URL list
  musicUrl?: string     // Background music URL (optional)
  outputDir: string     // Output directory for clips
  callbackUrl: string   // Callback URL when clip is done
  templateName?: string // Template name
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
      // Default: assume cap_cut is in PATH or use 'node src/cli.js' from cap-cut-auto dir
      capcutPath: 'cap_cut',
      outputBaseUrl: 'http://localhost:3000/videos',
      ...config,
    }
    this.tmpDir = path.join(os.tmpdir(), 'capcut-cli')
    if (!fs.existsSync(this.tmpDir)) {
      fs.mkdirSync(this.tmpDir, { recursive: true })
    }
  }

  // Expose config for API routes to read CLI path
  get capcutPath(): string {
    return this.config.capcutPath || 'cap_cut'
  }

  // Build correct CLI command: node src/cli.js video-clip [videos...] -t template -o output --callback url
  private buildClipArgs(videoPaths: string[], templateName: string, outputDir: string, callbackUrl: string, musicPath?: string): string[] {
    const args = [
      'video-clip',
      ...videoPaths,           // positional: video files
      '-t', templateName,
      '-o', outputDir,
      '--callback', callbackUrl,
    ]
    if (musicPath) {
      args.push('--bgm', musicPath)
    }
    return args
  }

  /**
   * Download video to temporary file
   * If URL is a local path (no scheme), just return the path as-is
   */
  private async downloadVideo(url: string): Promise<string> {
    // If it looks like a local path (no http/https scheme), return as-is
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return url
    }

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
   * Execute cap_cut clip command asynchronously
   * CLI runs in background and calls callback when done
   */
  clipAsync(input: CapcutClipInputAsync): void {
    // First check if output already exists (idempotency)
    const inputHash = this.computeInputHash(input.videoUrls)
    const outputDir = input.outputDir

    // Check if files already exist for this input
    if (fs.existsSync(outputDir)) {
      const existingFiles = fs.readdirSync(outputDir).filter(f => f.startsWith(`clip-${inputHash}`))
      if (existingFiles.length > 0) {
        console.log(`[CapcutCli] Output already exists for hash ${inputHash}, skipping`)
        // Already exists, no need to run CLI
        return
      }
    }

    const tempFiles: string[] = []
    let videoPaths: string[] = []

    // Download videos synchronously before spawning
    // Note: In production, you'd want to pre-download these or pass local paths
    console.log(`[CapcutCli] Starting async clip job`)
    console.log(`[CapcutCli] Output dir: ${outputDir}`)
    console.log(`[CapcutCli] Callback: ${input.callbackUrl}`)
    console.log(`[CapcutCli] Input hash: ${inputHash}`)

    // For async execution, we spawn the process without waiting
    // The CLI itself handles the callback to our server
    this.spawnClipProcess(input, tempFiles).catch(err => {
      console.error('[CapcutCli] Clip process error:', err)
    })
  }

  private async spawnClipProcess(input: CapcutClipInputAsync, tempFiles: string[]): Promise<void> {
    try {
      // Download videos to temp files
      videoPaths = await Promise.all(
        input.videoUrls.map(async (url) => {
          const localPath = await this.downloadVideo(url)
          tempFiles.push(localPath)
          return localPath
        })
      )

      // Download music if provided
      let musicPath: string | undefined
      if (input.musicUrl) {
        musicPath = await this.downloadMusic(input.musicUrl)
        tempFiles.push(musicPath)
      }

      // Build correct CLI command: node src/cli.js video-clip [videos...] -t template -o output --callback url
      const args = this.buildClipArgs(
        videoPaths,
        input.templateName || 'detail-focus',
        input.outputDir,
        input.callbackUrl,
        musicPath
      )

      // Spawn process (non-blocking)
      // Need to spawn "node" with "src/cli.js" as first arg, so use spawn with full command
      const cliCmd = this.config.capcutPath || 'cap_cut'
      console.log('[CapcutCli] Spawning:', `${cliCmd} ${args.join(' ')}`)

      const child = spawn(cliCmd, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: true,
      })

      child.unref() // Let parent process exit independently

      // Cleanup temp files after spawn
      // Keep them around for the CLI to read
      setTimeout(() => {
        this.cleanupFiles(tempFiles)
      }, 60000) // Cleanup after 1 minute

    } catch (error) {
      console.error('[CapcutCli] Spawn error:', error)
      // Cleanup temp files on error
      this.cleanupFiles(tempFiles)
    }
  }

  /**
   * Compute hash for input videos (for idempotency check)
   */
  private computeInputHash(videoUrls: string[]): string {
    const sorted = [...videoUrls].sort()
    const joined = sorted.join(',')
    return crypto.createHash('md5').update(joined).digest('hex').slice(0, 12)
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

      // Build correct CLI command for dry-run (same format as video-clip)
      // Note: CLI doesn't have dry-run mode, so we run with a short timeout
      // and check if it would produce output
      const args = this.buildClipArgs(
        videoPaths,
        'detail-focus',  // default template for count estimation
        this.tmpDir,
        'http://localhost:3000/api/video-push/callback?test=1',
        musicPath
      )

      const command = `${this.config.capcutPath} ${args.join(' ')}`
      console.log('[CapcutCli] Dry run (estimating):', command)

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
      console.error('[CapcutCli] clipDryRun error:', error)
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
