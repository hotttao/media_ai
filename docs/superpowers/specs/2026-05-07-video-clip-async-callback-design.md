---
name: video-clip-async-callback-design
description: 日发布计划-剪辑功能异步回调设计
status: complete
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

### CLI 新增参数

```bash
cap_cut clip \
  --videos /path/v1.mp4,/path/v2.mp4 \
  --template detail-focus \
  --output /uploads/teams/{teamId}/clips/2026-05-07/ \
  --callback http://localhost:3000/api/video-push/callback?videoPushId=xxx-xxx
```

| 参数 | 说明 |
|------|------|
| `--videos` | 视频文件路径列表，逗号分隔 |
| `--template` | 模板名称 |
| `--output` | 输出目录（使用 media_ai 的存储路径） |
| `--callback` | 完成后回调的 URL，包含 videoPushId 参数 |

### CLI 输出格式

```json
{
  "status": "success",
  "output": "/uploads/teams/team1/clips/2026-05-07/clip-abc123.mp4",
  "thumbnail": "/uploads/teams/team1/clips/2026-05-07/clip-abc123.jpg",
  "duration": 15
}
```

或失败：
```json
{
  "status": "failed",
  "error": { "code": "TEMPLATE_NOT_FOUND", "message": "模板不存在" }
}
```

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