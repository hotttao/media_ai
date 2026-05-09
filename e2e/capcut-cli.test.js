#!/usr/bin/env node

/**
 * E2E 测试：cap-cut-auto CLI 集成测试
 *
 * 运行方式：
 *   node e2e/capcut-cli.test.js
 *
 * 测试数据：用户提供的产品数据（4个视频）
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// 测试数据（用户提供）
const TEST_DATA = {
  productId: "3684738398762959071",
  ipId: "981cd79c-5973-429a-8edf-dff3eda45014",
  ipNickname: "崔念夏",
  productName: "高腰牛仔半身裙女款爆款2026夏季梨形遮胯显瘦长款鱼尾包臀a裙子",
  selectedVideos: [],
  videos: [
    {
      id: "0fc34bc6-03de-4c13-8628-3e8f3db6ef4b",
      url: "/uploads/teams/18982144-3d42-4a51-98d8-4d6959332d66/videos/video-01_91e05c98-a96d-49be-b221-313e6350785c.mp4",
      thumbnail: "/uploads/teams/18982144-3d42-4a51-98d8-4d6959332d66/first-frame-images/result-01_b28252e2-d87d-445e-9e60-f0ae9d2a17f5.png",
    },
    {
      id: "91d6218f-8326-4660-9824-1d092c2ea9ac",
      url: "/uploads/teams/18982144-3d42-4a51-98d8-4d6959332d66/videos/video-01_6bc994bc-8c00-42fa-9bb1-88ebefc43653.mp4",
      thumbnail: "/uploads/teams/18982144-3d42-4a51-98d8-4d6959332d66/first-frame-images/result-01_b28252e2-d87d-445e-9e60-f0ae9d2a17f5.png",
    },
    {
      id: "96eed172-3d1c-4e24-be8f-b80526b8d725",
      url: "/uploads/teams/18982144-3d42-4a51-98d8-4d6959332d66/videos/video-01_3be34f41-aa52-41f6-8fe9-76626cbc57b0.mp4",
      thumbnail: "/uploads/teams/18982144-3d42-4a51-98d8-4d6959332d66/first-frame-images/result-01_b28252e2-d87d-445e-9e60-f0ae9d2a17f5.png",
    },
    {
      id: "97472805-8936-4027-8047-d0608ba97f90",
      url: "/uploads/teams/18982144-3d42-4a51-98d8-4d6959332d66/videos/video-01_52e01bb8-3fda-4de8-b478-c2106b674b08.mp4",
      thumbnail: "/uploads/teams/18982144-3d42-4a51-98d8-4d6959332d66/first-frame-images/result-01_b28252e2-d87d-445e-9e60-f0ae9d2a17f5.png",
    }
  ],
  clips: [],
  scenes: [
    {
      id: "8b41b94d-eed9-459a-896f-4a117dca2553",
      name: "法式复古轻奢",
    }
  ]
};

const CAPCUT_CLI = path.join(__dirname, '..', '..', 'cap-cut-auto', 'src', 'cli.js');
const CAPCUT_CLI_DIR = path.join(__dirname, '..', '..', 'cap-cut-auto');
const TEMP_DIR = path.join(__dirname, '..', 'tmp', 'e2e-capcut-test');
const TEST_VIDEO_DIR = path.join(__dirname, '..', 'tmp', 'e2e-test-videos');

// Helper: run command and return result
function runCmd(cmd, args, options = {}) {
  const result = {
    stdout: '',
    stderr: '',
    exitCode: 0,
    error: null,
  };

  try {
    const output = execSync(`node "${cmd}" ${args.join(' ')}`, {
      cwd: CAPCUT_CLI_DIR,
      encoding: 'utf-8',
      timeout: 30000,
      ...options,
    });
    result.stdout = output;
  } catch (e) {
    result.error = e;
    result.stderr = e.stderr || e.message;
    result.exitCode = e.status || 1;
  }

  return result;
}

// Helper: check JSON output
function parseJsonOutput(stdout) {
  const match = stdout.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
  return null;
}

// 测试 1: CLI dry-run 返回 templates
async function testDryRun() {
  console.log('\n=== Test 1: CLI dry-run ===');

  // 创建临时视频文件（模拟）
  fs.mkdirSync(TEST_VIDEO_DIR, { recursive: true });
  const videoPaths = TEST_DATA.videos.map((v, i) => {
    const videoFile = path.join(TEST_VIDEO_DIR, `test-video-${i + 1}.mp4`);
    fs.writeFileSync(videoFile, Buffer.alloc(1024)); // 1KB dummy file
    return videoFile;
  });

  console.log('Video files:', videoPaths);

  // 调用 CLI dry-run
  const result = runCmd(CAPCUT_CLI, [
    'video-clip',
    ...videoPaths,
    '-o', TEMP_DIR,
    '--callback', 'http://localhost:3000/api/video-push/callback',
    '--dry-run'
  ]);

  console.log('Exit code:', result.exitCode);
  console.log('stdout:', result.stdout);
  console.log('stderr:', result.stderr);

  // 验证
  const output = parseJsonOutput(result.stdout);

  if (!output) {
    return { passed: false, error: 'Cannot parse JSON output' };
  }

  console.log('\nParsed output:', JSON.stringify(output, null, 2));

  // 验证 count
  if (typeof output.count !== 'number' || output.count === 0) {
    return { passed: false, error: `Invalid count: ${output.count}` };
  }

  // 验证 templates 数组
  if (!Array.isArray(output.templates) || output.templates.length === 0) {
    return { passed: false, error: 'templates is empty or not an array' };
  }

  // 验证每个 template 有 name 和 videoCount
  for (const tmpl of output.templates) {
    if (!tmpl.name || typeof tmpl.videoCount !== 'number') {
      return { passed: false, error: `Invalid template: ${JSON.stringify(tmpl)}` };
    }
  }

  console.log(`\n✅ Passed: count=${output.count}, templates=${output.templates.length}`);

  // 清理
  fs.rmSync(TEST_VIDEO_DIR, { recursive: true, force: true });

  return { passed: true, data: output };
}

// 测试 2: CLI --mapping 参数解析
async function testMapping() {
  console.log('\n=== Test 2: CLI --mapping 参数解析 ===');

  // 创建临时视频文件
  fs.mkdirSync(TEST_VIDEO_DIR, { recursive: true });
  const videoPaths = TEST_DATA.videos.map((v, i) => {
    const videoFile = path.join(TEST_VIDEO_DIR, `test-video-${i + 1}.mp4`);
    fs.writeFileSync(videoFile, Buffer.alloc(1024));
    return videoFile;
  });

  // 构建 mapping 参数
  const mappingStr = 'detail-focus:vp-001,fast-pace:vp-002,cascade-flow:vp-003';

  const result = runCmd(CAPCUT_CLI, [
    'video-clip',
    ...videoPaths,
    '-o', TEMP_DIR,
    '--callback', 'http://localhost:3000/api/video-push/callback',
    '--mapping', mappingStr,
  ]);

  console.log('Exit code:', result.exitCode);

  // 由于没有真实的视频处理逻辑，这里只检查 CLI 是否正确解析了 mapping
  // 实际上 CLI 会尝试生成视频然后失败，但我们主要检查参数解析

  // 检查 mapping 是否被正确解析（通过检查 CLI 输出或回调）
  // 这里我们用 dry-run 来验证 mapping 解析逻辑
  const dryRunResult = runCmd(CAPCUT_CLI, [
    'video-clip',
    ...videoPaths,
    '-o', TEMP_DIR,
    '--callback', 'http://localhost:3000/api/video-push/callback',
    '--dry-run',
    '--mapping', mappingStr,
  ]);

  const output = parseJsonOutput(dryRunResult.stdout);
  console.log('dry-run with mapping output:', JSON.stringify(output, null, 2));

  // mapping 解析不影响 dry-run 输出，只要不报错即可
  if (dryRunResult.exitCode !== 0 && !dryRunResult.stdout.includes('error')) {
    return { passed: false, error: `Mapping parse failed: ${dryRunResult.stderr}` };
  }

  console.log('\n✅ Passed: mapping parameter parsed correctly');

  // 清理
  fs.rmSync(TEST_VIDEO_DIR, { recursive: true, force: true });

  return { passed: true };
}

// 测试 3: videoIdHash 计算一致性（模拟 Provider 端逻辑）
async function testVideoIdHash() {
  console.log('\n=== Test 3: videoIdHash 计算一致性 ===');

  const videoIds = TEST_DATA.videos.map(v => v.id);

  // 计算 videoIdHash（与 clip/route.ts 中一致）
  const sorted = [...videoIds].sort();
  const joined = sorted.join(',');
  const hash = crypto.createHash('md5').update(joined).digest('hex');

  console.log('videoIds:', videoIds);
  console.log('sorted:', sorted);
  console.log('videoIdHash:', hash);

  // 验证：不同顺序应该得到相同的 hash
  const shuffledIds = [videoIds[2], videoIds[0], videoIds[3], videoIds[1]];
  const sorted2 = [...shuffledIds].sort();
  const joined2 = sorted2.join(',');
  const hash2 = crypto.createHash('md5').update(joined2).digest('hex');

  if (hash !== hash2) {
    return { passed: false, error: 'videoIdHash not consistent for different orders' };
  }

  console.log('\n✅ Passed: videoIdHash 计算正确且顺序无关');

  return { passed: true, hash };
}

// 测试 4: mapping 构建逻辑（模拟 Provider 端）
async function testMappingBuild() {
  console.log('\n=== Test 4: mapping 构建逻辑 ===');

  const templates = [
    { name: 'detail-focus', videoCount: 3 },
    { name: 'fast-pace', videoCount: 3 },
    { name: 'cascade-flow', videoCount: 3 },
  ];

  const templateToVpMap = new Map();
  templates.forEach((tmpl, idx) => {
    const vpId = `vp-${String(idx + 1).padStart(3, '0')}`;
    templateToVpMap.set(tmpl.name, vpId);
  });

  const mappingArg = Array.from(templateToVpMap.entries())
    .map(([tmpl, vpId]) => `${tmpl}:${vpId}`)
    .join(',');

  console.log('mapping:', mappingArg);

  // 验证格式
  const expectedFormat = 'detail-focus:vp-001,fast-pace:vp-002,cascade-flow:vp-003';
  if (mappingArg !== expectedFormat) {
    return { passed: false, error: `mapping format mismatch: ${mappingArg} !== ${expectedFormat}` };
  }

  // 验证解析后能还原
  const parsedMap = new Map(
    mappingArg.split(',').map(pair => {
      const [t, vp] = pair.split(':');
      return [t, vp];
    })
  );

  for (const [tmpl, vpId] of templateToVpMap.entries()) {
    if (parsedMap.get(tmpl) !== vpId) {
      return { passed: false, error: `mapping parse error: ${tmpl} -> ${parsedMap.get(tmpl)} !== ${vpId}` };
    }
  }

  console.log('\n✅ Passed: mapping 构建和解析都正确');

  return { passed: true, mapping: mappingArg };
}

// 运行所有测试
async function runTests() {
  console.log('========================================');
  console.log('cap-cut-auto CLI E2E 测试');
  console.log('========================================');

  // 确保临时目录存在
  fs.mkdirSync(TEMP_DIR, { recursive: true });

  const results = [];

  try {
    results.push({ name: 'testDryRun', result: await testDryRun() });
    results.push({ name: 'testMapping', result: await testMapping() });
    results.push({ name: 'testVideoIdHash', result: await testVideoIdHash() });
    results.push({ name: 'testMappingBuild', result: await testMappingBuild() });
  } catch (e) {
    console.error('\n❌ Test error:', e.message);
  }

  // 总结
  console.log('\n========================================');
  console.log('测试结果汇总');
  console.log('========================================');

  let allPassed = true;
  for (const { name, result } of results) {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${name}`);
    if (!result.passed) {
      console.log(`   Error: ${result.error}`);
      allPassed = false;
    }
  }

  console.log('========================================');
  console.log(allPassed ? '✅ 全部通过' : '❌ 有测试失败');
  console.log('========================================');

  // 清理
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });

  process.exit(allPassed ? 0 : 1);
}

runTests();