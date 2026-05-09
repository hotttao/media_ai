#!/usr/bin/env node
/**
 * Test script to verify CLI invocation process
 * Run: node test-cli-invocation.js
 *
 * This script tests:
 * 1. Whether clipAsync spawns a node process
 * 2. Whether the process remains running after spawn
 * 3. Whether CLI logs appear
 */

const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

// Test video paths (local paths that exist)
const testVideoPaths = [
  path.join(__dirname, 'public', 'uploads', 'teams', '18982144-3d42-4a51-98d8-4d6959332d66', 'videos', 'video-01_91e05c98-a96d-49be-b221-313e6350785c.mp4'),
  path.join(__dirname, 'public', 'uploads', 'teams', '18982144-3d42-4a51-98d8-4d6959332d66', 'videos', 'video-01_6bc994bc-8c00-42fa-9bb1-88ebefc43653.mp4'),
  path.join(__dirname, 'public', 'uploads', 'teams', '18982144-3d42-4a51-98d8-4d6959332d66', 'videos', 'video-01_3be34f41-aa52-41f6-8fe9-76626cbc57b0.mp4'),
]

const testOutputDir = path.join(__dirname, 'tmp', 'cli-test-output')
const testCallback = 'http://localhost:3000/api/video-push/callback'
const testMapping = 'detail-focus:vp-test-001,fast-pace:vp-test-002'

// Ensure output dir exists
if (!fs.existsSync(testOutputDir)) {
  fs.mkdirSync(testOutputDir, { recursive: true })
}

console.log('=== CLI Invocation Test ===')
console.log('Video paths:', testVideoPaths)
console.log('Output dir:', testOutputDir)
console.log('')

// Check if test video files exist
for (const vp of testVideoPaths) {
  if (fs.existsSync(vp)) {
    console.log(`✓ Video exists: ${path.basename(vp)}`)
  } else {
    console.log(`✗ Video NOT found: ${vp}`)
  }
}
console.log('')

// Build the CLI command that CapcutCliProvider would build
// From buildClipArgs: video-clip [videos...] -o output --callback url [--mapping vp:tmpl] [--bgm music]
const cliBase = path.join(__dirname, '..', 'cap-cut-auto')
const cliScript = path.join(cliBase, 'src', 'cli.js')

const args = [
  'video-clip',
  ...testVideoPaths,
  '-o', testOutputDir,
  '--callback', testCallback,
  '--mapping', testMapping,
]

console.log('CLI command:', `cd "${cliBase}" && node "${cliScript}" ${args.join(' ')}`)
console.log('')

// Spawn the CLI process (same way clipAsync does)
console.log('Spawning CLI process...')
const child = spawn('node', [cliScript, ...args], {
  cwd: cliBase,
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true,
})

let stdoutData = ''
let stderrData = ''

child.stdout?.on('data', (data) => {
  const text = data.toString()
  stdoutData += text
  console.log('[CLI stdout]:', text.trim())
})

child.stderr?.on('data', (data) => {
  const text = data.toString()
  stderrData += text
  console.log('[CLI stderr]:', text.trim())
})

child.on('close', (code) => {
  console.log(`[CLI exited with code ${code}]`)
  if (stdoutData) console.log('[Full stdout]:', stdoutData)
  if (stderrData) console.log('[Full stderr]:', stderrData)
})

child.on('error', (err) => {
  console.error('[CLI spawn error]:', err.message)
})

child.unref()

// Wait 5 seconds then check if process is still running
console.log('')
console.log('Waiting 5 seconds to check process status...')
setTimeout(() => {
  // On Windows, use tasklist to check for node processes
  const { execSync } = require('child_process')
  try {
    const output = execSync('tasklist /FI "IMAGENAME eq node.exe" /FO TABLE', { encoding: 'utf8' })
    console.log('\n=== Active Node Processes ===')
    console.log(output)
  } catch (e) {
    console.log('Could not list processes:', e.message)
  }

  // Check output directory for generated files
  console.log('\n=== Output Directory Contents ===')
  if (fs.existsSync(testOutputDir)) {
    const files = fs.readdirSync(testOutputDir)
    if (files.length > 0) {
      files.forEach(f => {
        const stats = fs.statSync(path.join(testOutputDir, f))
        console.log(`  ${f} (${stats.size} bytes)`)
      })
    } else {
      console.log('  (empty)')
    }
  } else {
    console.log('  (directory does not exist)')
  }

  console.log('\n=== Test Complete ===')
}, 5000)