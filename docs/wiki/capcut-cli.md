# CapcutCliProvider ↔ CLI 接口协议

## 一、设计原则

1. **Provider 管输入，CLI 管模板** — Provider 只负责把视频文件准备好传进去，CLI 自己决定用哪些模板
2. **双阶段：dry-run → 正式执行** — dry-run 获取 templates 列表用于预创建 VideoPush 记录
3. **幂等性 + 文件名确定性** — 同一 videoIds + 同一 template → 同一输出文件名，CLI 保证幂等
4. **videoPushId↔templateName 映射** — Provider 预先建立映射，CLI 执行时利用确定性文件名关联回调
5. **一template一视频** — 每个 template 只生成一条视频（一个 clip），不是数组

---

## 二、双阶段执行流程

### 阶段一：dry-run（预扫描）

```
Provider                          CLI
   │                               │
   │── video-clip --dry-run ──────▶│
   │   [files...]                  │
   │                               │  检查所有模板，计算需要生成的 clips 总数
   │                               │
   │◀── { count: 8, templates: [] }│
   │                               │
   ▼
Provider 创建 8 条 VideoPush 记录
(videoIdHash 相同，templateName 各不同)
并建立 templateName → videoPushId 映射
```

### 阶段二：正式执行

```
Provider                          CLI
   │                               │
   │── video-clip ─────────────────▶│
   │   [files...]                 │
   │   --callback <url>            │
   │   --mapping tmpl1:vp1,tmpl2:vp2,...
   │                               │
   │                               │  对每个 template：
   │                               │    1. 计算输出文件名（确定性）
   │                               │    2. 用 mapping 查到 videoPushId
   │                               │    3. 执行或跳过（如已存在）
   │                               │    4. 回调时带回 videoPushId
   │                               │
   │◀── stdout: { clip: {...} } ───│  （每个 template 一个 stdout）
   │                               │
   │◀── POST callback?videoPushId=vp1 ──│  detail-focus 完成
   │◀── POST callback?videoPushId=vp2 ──│  fast-pace 完成
   │   ...（每个 template 单独回调）     │
```

**关键**：CLI 对每个 template 都会：
1. 输出一个 clip 结果到 stdout
2. 发起一次回调（带对应的 videoPushId）

---

## 三、CLI 命令接口

### 3.1 video-clip 命令

#### 格式

```bash
node src/cli.js video-clip [视频路径...] -o <输出目录> --callback <回调URL> [--dry-run] [--mapping <tmpl:vp,mappings>] [--bgm <音乐路径>]
```

#### 参数

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `[视频路径...]` | ✅ | — | 本地视频文件路径 |
| `-o, --output` | ✅ | `./output` | 输出目录 |
| `--callback` | ✅ | — | 回调 URL |
| `--dry-run` | ❌ | false | dry-run 模式，不生成文件，只返回 count |
| `--mapping` | ❌ | — | templateName↔videoPushId 映射，格式：`template1:vp1,template2:vp2,...` |
| `--bgm` | ❌ | — | 背景音乐文件路径 |

#### dry-run 模式返回（stdout）

```json
{
  "count": 8,
  "templates": [
    { "name": "detail-focus", "videoCount": 3 },
    { "name": "fast-pace", "videoCount": 3 },
    { "name": "cascade-flow", "videoCount": 3 },
    { "name": "orbit-focus", "videoCount": 3 },
    { "name": "panorama-wide", "videoCount": 3 },
    { "name": "progressive-reveal", "videoCount": 3 },
    { "name": "rhythm-cut", "videoCount": 3 },
    { "name": "zoom-pulse", "videoCount": 3 }
  ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `count` | number | 将要生成的 clips 总数 |
| `templates` | array | 适用的模板列表（含需要的视频数量） |
| `templates[].name` | string | 模板名称 |
| `templates[].videoCount` | number | 该模板需要的视频文件数量 |

#### 正式执行返回（stdout）

每个 template 执行后输出**一条** clip 结果：

```json
{
  "template": "detail-focus",
  "url": "clip-md5hash_detail-focus.mp4",
  "duration": 15,
  "size": 1048576
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `template` | string | 模板名称 |
| `url` | string | 输出文件名（不含路径） |
| `duration` | number | 视频时长（秒） |
| `size` | number | 文件大小（字节） |

**注意**：stdout 每条 clip 输出一个 JSON 行（JSON Lines 格式），或每次输出一个完整 JSON（CLI 依次执行每个 template）。

#### 回调（CLI → Provider）

**回调时机**：每个 clip 执行完成后立即回调（无论成功还是跳过）。

**回调 URL 格式**：
```
POST {callback}?videoPushId={videoPushId}
```

**回调 Body 格式**：
```json
{
  "videoPushId": "vp-uuid-xxx",
  "template": "detail-focus",
  "status": "success",
  "output": "clip-md5hash_detail-focus.mp4",
  "duration": 15,
  "error": null
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `videoPushId` | ✅ | 从 --mapping 中根据 template 查到的 videoPushId |
| `template` | ✅ | 模板名称 |
| `status` | ✅ | `success` / `failed` / `skipped` |
| `output` | ❌ | 输出文件名（成功时返回，跳过时也返回） |
| `duration` | ❌ | 视频时长（秒） |
| `error` | ❌ | 失败原因，格式 `{ code, message }` |

**跳过时的回调**：
```json
{
  "videoPushId": "vp-uuid-xxx",
  "template": "detail-focus",
  "status": "skipped",
  "output": "clip-md5hash_detail-focus.mp4",
  "error": null
}
```

---

## 四、Provider 侧实现（media_ai）

### 4.1 dry-run 阶段

```typescript
// 1. 调用 CLI dry-run
const dryRunResult = await capcut.clipDryRun({
  videoUrls: videoPaths,  // 本地路径
})

// dryRunResult.count = 8
// dryRunResult.templates = [{ name: "detail-focus", videoCount: 3 }, ...]

// 2. 根据 templates 创建 VideoPush 记录
const templateToVpMap: Map<string, string> = new Map()  // templateName → videoPushId

for (const tmpl of dryRunResult.templates) {
  const record = await db.videoPush.create({
    data: {
      productId,
      ipId,
      sceneId,
      videoId: videoIds.join(','),
      videoIdHash,
      templateName: tmpl.name,
      status: 'pending',
    }
  })
  templateToVpMap.set(tmpl.name, record.id)
}

// 3. 构建 --mapping 参数
const mappingArg = Array.from(templateToVpMap.entries())
  .map(([tmpl, vpId]) => `${tmpl}:${vpId}`)
  .join(',')
// 例: "detail-focus:vp-001,fast-pace:vp-002,..."
```

### 4.2 正式执行阶段

```typescript
// 调用 CLI 正式执行
capcut.clipAsync({
  videoUrls: videoPaths,
  outputDir,
  callbackUrl: `${baseUrl}/api/video-push/callback`,
  mapping: mappingArg,  // "detail-focus:vp-001,fast-pace:vp-002,..."
})
```

### 4.3 callback 端点

```typescript
// POST /api/video-push/callback?videoPushId=xxx
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const videoPushId = searchParams.get('videoPushId')

  const body = await request.json()
  const { template, status, output, duration, error } = body

  // 更新 VideoPush 记录
  await db.videoPush.update({
    where: { id: videoPushId },
    data: {
      status: status === 'skipped' ? 'completed' : status,
      url: output || undefined,
    }
  })
}
```

### 4.4 完成判断

```typescript
// 检查是否所有 clips 都完成
const totalExpected = templateToVpMap.size  // dry-run 返回的 templates 数量
const completedCount = await db.videoPush.count({
  where: {
    videoIdHash,
    status: { in: ['completed', 'failed'] }
  }
})

if (completedCount === totalExpected) {
  // 所有 clips 都已处理完成
}
```

---

## 五、完整执行示例

### 5.1 初始数据

```
productId = "prod-abc"
ipId = "ip-xyz"
sceneId = "scene-123"
videoIds = ["vid-1", "vid-2", "vid-3"]

视频文件（本地路径）：
  /public/uploads/teams/team1/videos/vid-1.mp4
  /public/uploads/teams/team1/videos/vid-2.mp4
  /public/uploads/teams/team1/videos/vid-3.mp4
```

### 5.2 阶段一：dry-run

**Provider → CLI**：
```bash
cd ../cap-cut-auto && node src/cli.js video-clip \
  /public/uploads/teams/team1/videos/vid-1.mp4 \
  /public/uploads/teams/team1/videos/vid-2.mp4 \
  /public/uploads/teams/team1/videos/vid-3.mp4 \
  -o /tmp/capcut-dryrun \
  --callback http://localhost:3000/api/video-push/callback \
  --dry-run
```

**CLI → Provider**：
```json
{
  "count": 8,
  "templates": [
    { "name": "detail-focus", "videoCount": 3 },
    { "name": "fast-pace", "videoCount": 3 },
    { "name": "cascade-flow", "videoCount": 3 },
    { "name": "orbit-focus", "videoCount": 3 },
    { "name": "panorama-wide", "videoCount": 3 },
    { "name": "progressive-reveal", "videoCount": 3 },
    { "name": "rhythm-cut", "videoCount": 3 },
    { "name": "zoom-pulse", "videoCount": 3 }
  ]
}
```

**Provider 创建 8 条 VideoPush 记录**：

| id | templateName | videoIdHash | productId | ipId | sceneId | status |
|---|---|---|---|---|---|---|
| vp-001 | detail-focus | md5hash | prod-abc | ip-xyz | scene-123 | pending |
| vp-002 | fast-pace | md5hash | prod-abc | ip-xyz | scene-123 | pending |
| vp-003 | cascade-flow | md5hash | prod-abc | ip-xyz | scene-123 | pending |
| vp-004 | orbit-focus | md5hash | prod-abc | ip-xyz | scene-123 | pending |
| vp-005 | panorama-wide | md5hash | prod-abc | ip-xyz | scene-123 | pending |
| vp-006 | progressive-reveal | md5hash | prod-abc | ip-xyz | scene-123 | pending |
| vp-007 | rhythm-cut | md5hash | prod-abc | ip-xyz | scene-123 | pending |
| vp-008 | zoom-pulse | md5hash | prod-abc | ip-xyz | scene-123 | pending |

**Provider 构建 mapping**：
```
detail-focus:vp-001,fast-pace:vp-002,cascade-flow:vp-003,orbit-focus:vp-004,panorama-wide:vp-005,progressive-reveal:vp-006,rhythm-cut:vp-007,zoom-pulse:vp-008
```

### 5.3 阶段二：正式执行

**Provider → CLI**：
```bash
cd ../cap-cut-auto && node src/cli.js video-clip \
  /public/uploads/teams/team1/videos/vid-1.mp4 \
  /public/uploads/teams/team1/videos/vid-2.mp4 \
  /public/uploads/teams/team1/videos/vid-3.mp4 \
  -o /public/uploads/teams/team1/clips/2026-05-09 \
  --callback http://localhost:3000/api/video-push/callback \
  --mapping detail-focus:vp-001,fast-pace:vp-002,cascade-flow:vp-003,orbit-focus:vp-004,panorama-wide:vp-005,progressive-reveal:vp-006,rhythm-cut:vp-007,zoom-pulse:vp-008
```

**CLI stdout（每个 template 输出一行）**：
```
{"template":"detail-focus","url":"clip-md5hash_detail-focus.mp4","duration":15,"size":1048576}
{"template":"fast-pace","url":"clip-md5hash_fast-pace.mp4","duration":12,"size":983040}
{"template":"cascade-flow","url":"clip-md5hash_cascade-flow.mp4","duration":10,"size":851968}
{"template":"orbit-focus","url":"clip-md5hash_orbit-focus.mp4","duration":14,"size":966656}
{"template":"panorama-wide","url":"clip-md5hash_panorama-wide.mp4","duration":16,"size":1114112}
{"template":"progressive-reveal","url":"clip-md5hash_progressive-reveal.mp4","duration":13,"size":929792}
{"template":"rhythm-cut","url":"clip-md5hash_rhythm-cut.mp4","duration":11,"size":917504}
{"template":"zoom-pulse","url":"clip-md5hash_zoom-pulse.mp4","duration":15,"size":1048576}
```

**CLI 回调 1**（detail-focus 完成）：
```
POST http://localhost:3000/api/video-push/callback?videoPushId=vp-001
Body: {
  "videoPushId": "vp-001",
  "template": "detail-focus",
  "status": "success",
  "output": "clip-md5hash_detail-focus.mp4",
  "duration": 15,
  "error": null
}
```

**CLI 回调 2**（fast-pace 完成）：
```
POST http://localhost:3000/api/video-push/callback?videoPushId=vp-002
Body: {
  "videoPushId": "vp-002",
  "template": "fast-pace",
  "status": "success",
  "output": "clip-md5hash_fast-pace.mp4",
  "duration": 12,
  "error": null
}
```

（每个 template 完成时都会回调，共 8 次）

### 5.4 完成状态

**VideoPush 记录更新后**：

| id | templateName | status | url |
|---|---|---|---|
| vp-001 | detail-focus | completed | clip-md5hash_detail-focus.mp4 |
| vp-002 | fast-pace | completed | clip-md5hash_fast-pace.mp4 |
| vp-003 | cascade-flow | completed | clip-md5hash_cascade-flow.mp4 |
| vp-004 | orbit-focus | completed | clip-md5hash_orbit-focus.mp4 |
| vp-005 | panorama-wide | completed | clip-md5hash_panorama-wide.mp4 |
| vp-006 | progressive-reveal | completed | clip-md5hash_progressive-reveal.mp4 |
| vp-007 | rhythm-cut | completed | clip-md5hash_rhythm-cut.mp4 |
| vp-008 | zoom-pulse | completed | clip-md5hash_zoom-pulse.mp4 |

---

## 六、数据模型

### VideoPush 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | String (UUID) | 主键 |
| `productId` | String | 关联的产品 ID |
| `ipId` | String? | 关联的 IP ID（可选） |
| `sceneId` | String | 关联的场景 ID |
| `videoId` | String | 视频 ID 列表，逗号分隔，如 `"vid-1,vid-2,vid-3"` |
| `videoIdHash` | String | videoIds 排序后 MD5，同一组视频共享 |
| `templateName` | String? | 当前绑定的模板名称 |
| `musicId` | String? | 音乐 ID |
| `url` | String | clip 输出路径 |
| `thumbnail` | String? | 缩略图路径 |
| `status` | String | 状态：`pending` / `completed` / `failed` |
| `isQualified` | Boolean | 是否达标可发布 |
| `isPublished` | Boolean | 是否已发布 |
| `createdAt` | DateTime | 创建时间 |
| `updatedAt` | DateTime | 更新时间 |

### 索引

```prisma
@@index([productId, ipId, sceneId, videoIdHash], map: "idx_video_push_source")
@@index([videoId], map: "idx_video_push_video")
```

### 关联关系

- `productId` → Product 表（一对多）
- `videoIdHash` 用于快速查找同一组视频的所有 clip 记录

---

## 七、幂等性保证

CLI 输出文件名格式：`clip-{md5hash}_{template}.mp4`

- `md5hash` = `md5(sorted([视频文件路径]).join(','))`
- 同一组视频 + 同一模板 → 同一输出文件名

**幂等处理**：
1. CLI 执行前先检查 `outputDir` 中是否已存在该文件
2. 若存在，跳过执行，直接回调 `status: "skipped"`
3. 若不存在，执行生成，完成后回调 `status: "success"`

---

## 八、CLI 需要实现的能力

| 能力 | 当前状态 | 说明 |
|------|---------|------|
| `--dry-run` 参数 | ❌ | 返回 count + templates 列表 |
| `--mapping` 参数解析 | ❌ | 解析 `template:vpId` 格式的映射 |
| 多 template 遍历执行 | ❌ | 当前只处理单个 template（-t 参数） |
| 每 template 单独回调 | ❌ | 当前只有一次回调，需改为每个 template 回调一次 |
| 回调 body 包含 videoPushId | ❌ | 当前缺失，需实现 |
| 根据 videoCount 过滤模板 | ❌ | 当前只检查 3clip 目录，需扩展到 4clip 等 |
| stdout 输出（每行一个 clip） | ❌ | 每个 template 输出一行 JSON |
| 幂等检查（按 template） | ⚠️ | 当前只检查文件是否存在，需改为按 template 检查 |

---

## 九、错误处理

### 9.1 Provider 侧

| 错误来源 | 处理方式 |
|---------|---------|
| 视频下载失败 | 返回错误，不调用 CLI |
| dry-run 失败 | 返回 `{ count: 0, error }` |
| CLI 执行超时 | 视为失败，更新 videoPush 状态为 failed |

### 9.2 CLI 侧错误

失败时仍回调：
```json
{
  "videoPushId": "vp-xxx",
  "template": "detail-focus",
  "status": "failed",
  "output": null,
  "error": { "code": "EXECUTION_FAILED", "message": "FFmpeg error: ..." }
}
```

### 9.3 临时文件清理

只有下载到 `tmpDir` 的临时文件（视频下载、music 下载）才清理。
输出文件在 `outputDir` 中，不清理。

---

## 十、模板分组（CLI 应发现的模板）

| 分组 | 需要的视频数 | 模板 |
|------|------------|------|
| `3clip/` | 3 | detail-focus, fast-pace, cascade-flow, orbit-focus, panorama-wide, progressive-reveal, rhythm-cut, zoom-pulse |
| `4clip/` | 4 | luxury |
| `photo/` | >=5 | slideshow |

**过滤规则**：dry-run 时，CLI 只返回 `videoCount <= 实际视频数量` 的模板。例如：
- 3 个视频 → 返回所有 3clip 模板（8 个）
- 4 个视频 → 返回所有 3clip + 4clip 模板（9 个）
- 5+ 个视频 → 返回所有 3clip + 4clip + photo 模板（10 个）