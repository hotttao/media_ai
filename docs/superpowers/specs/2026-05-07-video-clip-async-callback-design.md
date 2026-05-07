---
name: video-clip-async-callback-design
description: 日发布计划-剪辑功能异步回调设计
status: in-review
created: 2026-05-07T15:25:20Z
updated: 2026-05-07T15:25:20Z
---

# 视频剪辑异步回调设计方案

## 背景

当日发布计划-剪辑功能需要：
1. 异步调用本地剪辑 CLI 工具
2. CLI 完成后通过回调通知系统
3. 支持幂等性：相同输入不重复剪辑

## 数据模型

### VideoPush 表变更

```prisma
model VideoPush {
  id                String   @id @default(uuid())
  videoId           String   @map("video_id") @db.VarChar(500)  // "vid-1,vid-2,vid-3" 逗号分隔
  videoIdHash       String   @map("video_id_hash")               // 排序后逗号拼接的MD5
  productId         String   @map("product_id")
  ipId              String   @map("ip_id")
  sceneId           String   @map("scene_id")
  templateName      String?  @map("template_name")
  musicId           String?  @map("music_id")
  url               String   @default("") @db.VarChar(500)
  thumbnail         String?  @db.VarChar(500)
  status            String   @default("pending")  // pending | completed | failed
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([productId, ipId, sceneId, videoIdHash], map: "idx_video_push_source")
}
```

**字段说明：**
- `videoId`: 来源视频ID列表，逗号分隔
- `videoIdHash`: 排序后逗号拼接的MD5，用于快速查询相同来源的剪辑
- `sceneId`: 场景ID，剪辑视频只能来自同一产品+IP+场景
- `status`: pending(待剪辑) / completed(已完成) / failed(失败)
- `url`: 空字符串表示未完成，有值表示已完成

## 核心流程

### 1. 预览阶段 - 计算可剪辑数量

```
GET /api/video-push/clip-preview?productId=xxx&ipId=yyy&sceneId=zzz
```

**逻辑：**
1. 查询 VideoPush 中 `(productId, ipId, sceneId)` 下的所有记录
2. 按 `videoIdHash` 分组，统计每组的 pending + completed 数量
3. 对每个 videoIdHash 组调用 CLI dry-run 获取 potential clips
4. 返回每个组的可剪辑数量 = potential - (pending + completed)

**响应：**
```json
{
  "groups": [
    { "videoIdHash": "abc123", "videoIds": "v1,v2,v3", "clippable": 5, "existing": 3 },
    { "videoIdHash": "def456", "videoIds": "v4,v5", "clippable": 2, "existing": 0 }
  ]
}
```

### 2. 预创建阶段 - 创建 pending 记录

```
POST /api/video-push/prepare-clips
{
  "productId": "xxx",
  "ipId": "yyy",
  "sceneId": "zzz",
  "videoIds": ["v1", "v2", "v3"],
  "templateName": "detail-focus"
}
```

**逻辑：**
1. 计算 `videoIdHash = MD5(sort(videoIds).join(","))`
2. 调用 CLI dry-run 获取 potential clips 数量
3. 批量创建 N 条 VideoPush 记录（status=pending, url=""）
4. 幂等：若已存在相同 videoIdHash 的 pending/completed 记录，跳过

**响应：**
```json
{
  "videoIdHash": "abc123",
  "createdCount": 5,
  "existingCount": 3,
  "totalClippable": 5
}
```

### 3. 执行阶段 - 触发 CLI 剪辑

```
POST /api/video-push/clip
{
  "productId": "xxx",
  "ipId": "yyy",
  "sceneId": "zzz",
  "videoIds": ["v1", "v2", "v3"],
  "musicId": "music-xxx"
}
```

**逻辑：**
1. 查找 `status=pending` 且 `videoIdHash` 匹配的记录
2. 若没有 pending 记录，返回 error（需先调用 prepare-clips）
3. 调用 CLI 执行剪辑（异步，不等待结果）
4. 返回待执行的 pending 数量

**响应：**
```json
{
  "message": "Started clipping 5 videos",
  "pendingCount": 5
}
```

### 4. 回调阶段 - CLI 通知完成

```
POST /api/video-push/callback?videoPushId=xxx-xxx
```

**无需认证**

**请求体：**
```json
{
  "status": "success",
  "output": "/uploads/teams/team1/clips/2026-05-07/clip-abc123.mp4",
  "error": null
}
```

**或失败：**
```json
{
  "status": "failed",
  "output": null,
  "error": { "code": "TEMPLATE_NOT_FOUND", "message": "模板不存在" }
}
```

**逻辑：**
1. 根据 videoPushId 找到 VideoPush 记录
2. 更新 `url` = output, `status` = "completed" 或 "failed"
3. 返回 200 OK

## CLI 接口要求

### 必要能力

1. **支持异步执行**：CLI 接收任务后立即返回 PID/任务ID，后台执行，不阻塞调用方
2. **支持回调通知**：CLI 执行完成后 HTTP POST 到指定 URL
3. **幂等性保证**：相同输入（相同视频集合 + 模板）生成相同输出（相同文件名），不会重复生成
4. **输出路径包含输入特征**：生成的文件名包含输入的哈希值，便于匹配 VideoPush 记录

### CLI 新增参数

```bash
cap_cut clip \
  --videos /path/v1.mp4,/path/v2.mp4 \
  --template detail-focus \
  --output /uploads/teams/{teamId}/clips/2026-05-07/ \
  --callback http://localhost:3000/api/video-push/callback?videoPushId=xxx-xxx
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--videos` | string | 是 | 视频文件路径列表，逗号分隔 |
| `--template` | string | 是 | 模板名称（detail-focus, luxury 等） |
| `--output` | string | 是 | 输出目录，必须是 media_ai 的存储路径 `/uploads/teams/{teamId}/clips/{date}/` |
| `--callback` | string | 是 | 完成后回调的 URL，URL 中包含 `videoPushId` 参数 |

### CLI 执行流程

```
1. 接收参数，解析视频路径列表
2. 验证视频文件是否存在
3. 计算输入的哈希值（用于生成确定性文件名）
4. 检查 output 目录下是否已存在对应文件（幂等检查）
   - 若存在：跳过执行，直接回调通知（status=skipped）
5. 执行 FFmpeg 剪辑
6. 生成输出文件（文件名包含哈希特征）
7. 执行完成后，HTTP POST 到 --callback URL
   - POST body 包含执行结果
8. 退出（CLI 自身不等待回调结果返回）
```

### CLI 回调格式

**执行成功：**
```json
{
  "status": "success",
  "videoPushId": "xxx-xxx",
  "output": "/uploads/teams/team1/clips/2026-05-07/clip-abc123.mp4",
  "thumbnail": "/uploads/teams/team1/clips/2026-05-07/clip-abc123.jpg",
  "duration": 15,
  "error": null
}
```

**执行失败：**
```json
{
  "status": "failed",
  "videoPushId": "xxx-xxx",
  "output": null,
  "thumbnail": null,
  "duration": null,
  "error": {
    "code": "TEMPLATE_NOT_FOUND",
    "message": "模板不存在",
    "availableTemplates": ["cascade-flow", "detail-focus", "luxury", ...]
  }
}
```

**幂等跳过（文件已存在）：**
```json
{
  "status": "skipped",
  "videoPushId": "xxx-xxx",
  "output": "/uploads/teams/team1/clips/2026-05-07/clip-abc123.mp4",
  "reason": "output_exists"
}
```

### CLI 错误码

| 错误码 | 说明 |
|--------|------|
| `TEMPLATE_NOT_FOUND` | 模板不存在 |
| `TEMPLATE_DISABLED` | 模板已被禁用 |
| `INSUFFICIENT_VIDEOS` | 视频数量不足（至少需要模板要求的数量） |
| `MISSING_ARGUMENT` | 缺少必要参数（videos, template, output, callback） |
| `OUTPUT_DIR_NOT_FOUND` | 输出目录不存在 |
| `VIDEO_FILE_NOT_FOUND` | 视频文件不存在 |
| `EXECUTION_FAILED` | FFmpeg 执行失败 |

### 幂等性实现要求

CLI 必须在执行前检查 output 目录下是否已存在以 `clip-{hash}` 开头的文件：

```
output/
  clip-{hash1}_detail-focus.mp4    ← 已存在，跳过
  clip-{hash2}_detail-focus.mp4    ← 待执行
  clip-{hash3}_luxury.mp4          ← 待执行
```

文件名格式：`clip-{inputHash}_{templateName}.mp4`

其中 `inputHash = MD5(sort(videoPaths).join(","))`

## API 路由

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/video-push/clip-preview` | 预览可剪辑数量 |
| POST | `/api/video-push/prepare-clips` | 预创建 pending 记录 |
| POST | `/api/video-push/clip` | 执行剪辑 |
| POST | `/api/video-push/callback` | CLI 回调（无需认证） |

## 幂等性保证

1. **videoIdHash**: 相同来源视频集 → 相同哈希 → 可快速查重
2. **CLI 幂等**: 相同输入 → 生成相同文件名 → 不会重复生成
3. **预创建检查**: prepare-clips 时检查已有记录，避免重复创建
4. **callback 匹配**: 通过 videoPushId 精确更新单条记录

## 存储路径

视频存储在：`/uploads/teams/{teamId}/clips/{date}/`

CLI 执行时指定 output 目录为：`/uploads/teams/{teamId}/clips/{YYYY-MM-DD}/`