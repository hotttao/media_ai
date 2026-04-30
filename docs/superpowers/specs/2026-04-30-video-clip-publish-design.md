---
name: video-clip-publish-design
description: 视频剪辑和发布功能设计 - cap_cut CLI 集成和 video_push 表
status: approved
created: 2026-04-30T15:13:09Z
updated: 2026-04-30T15:13:09Z
---

# 视频剪辑和发布功能设计

## 概述

通过本地 CLI 工具 cap_cut 对产品下的 AI 视频进行批量剪辑，生成可发布视频。剪辑后仅标记为「可发布」状态，不自动发布到平台。

## 核心流程

1. 用户在每日发布计划页面选择日期，查看当天产品列表
2. 点击产品「剪辑」按钮（该产品下所有 AI 视频参与）
3. 系统自动从背景音乐素材库随机选一条，调用 `cap_cut` CLI
4. cap_cut 遍历所有模板，每个模板生成一套视频（异步执行）
5. 返回结果存入 `video_push` 表，用户稍后刷新查看

## 数据模型

### 1. VideoPush 表

```prisma
model VideoPush {
  id              String   @id @default(uuid()) @db.VarChar(36)
  videoId         String   @map("video_id") @db.VarChar(36)   // 来源AI视频ID
  productId       String   @map("product_id") @db.VarChar(36)
  ipId            String   @map("ip_id") @db.VarChar(36)
  templateId      String?  @map("template_id")                 // cap_cut返回的模板标识
  templateName   String?  @map("template_name")              // 模板名称
  musicId         String?  @map("music_id")                   // 随机选中的背景音乐
  url             String   @db.VarChar(500)
  thumbnail       String?  @db.VarChar(500)
  title           String?  @db.VarChar(200)
  description     String?  @db.Text
  clipParams      String?  @db.Text                           // cap_cut返回的原始参数JSON
  isQualified     Boolean  @default(false) @map("is_qualified") // 是否达标可发布
  isPublished     Boolean  @default(false) @map("is_published") // 是否已发布
  createdAt       DateTime @default(now()) @map("created_at")

  product         Product  @relation(fields: [productId], references: [id])
  @@index([productId], map: "idx_video_push_product")
  @@index([isQualified], map: "idx_video_push_qualified")
  @@map("video_pushes")
}
```

### 2. MaterialType 扩展

```prisma
enum MaterialType {
  SCENE
  POSE
  MAKEUP
  ACCESSORY
  CLIP_TEMPLATE      // 剪辑模板
  BACKGROUND_MUSIC  // 背景音乐
  COVER_TEMPLATE     // 封面模板
  OTHER
}
```

## cap_cut 集成

### CLI 调用格式

```bash
cap_cut clip \
  --videos "path/video1.mp4,path/video2.mp4" \
  --music "path/music1.mp3" \
  --output "/path/to/output"
```

### 返回 JSON 格式

```json
{
  "clips": [
    {
      "template": "template_name",
      "templateId": "tmpl_001",
      "url": "/path/to/output/template_name/video.mp4",
      "thumbnail": "/path/to/output/template_name/thumb.jpg",
      "params": { "key": "value" },
      "duration": 15,
      "size": 2048000
    }
  ]
}
```

### 视频 URL 处理

- cap_cut 返回的是本地路径，需要转换为可访问的 URL
- 配置文件指定视频存储的基础路径和对应的 URL 前缀

## API 设计

### 1. 执行剪辑

```
POST /api/video-push/clip
```

请求：
```json
{
  "productId": "xxx"
}
```

响应：
```json
{
  "success": true,
  "message": "剪辑任务已提交"
}
```

处理逻辑：
1. 查询该 product 下所有 AI 视频
2. 随机从 BACKGROUND_MUSIC 素材库选择一条音乐
3. 调用 cap_cut CLI（异步）
4. 解析返回结果，创建 VideoPush 记录

### 2. 获取可发布视频列表

```
GET /api/video-push?productId=xxx&qualified=true
```

响应：
```json
{
  "videos": [
    {
      "id": "xxx",
      "videoId": "yyy",
      "templateName": "模板1",
      "url": "https://...",
      "thumbnail": "https://...",
      "isQualified": true,
      "isPublished": false,
      "createdAt": "2026-04-30T10:00:00Z"
    }
  ]
}
```

### 3. 标记发布状态

```
POST /api/video-push/:id/qualify
```

请求：
```json
{
  "qualified": true
}
```

### 4. 获取当日发布计划产品列表

```
GET /api/daily-publish-plan/:date/products
```

响应：
```json
{
  "products": [
    {
      "productId": "xxx",
      "productName": "产品A",
      "productImage": "...",
      "ipId": "zzz",
      "aiVideoCount": 5,
      "pushableCount": 3,
      "publishedCount": 1
    }
  ]
}
```

## 每日发布计划页面

### 页面路径

`/daily-publish-plan`

### 布局

- 顶部：日期选择器 + 虚拟 IP 筛选器
- 主体：产品卡片列表

### 产品卡片

```
┌─────────────────────────────────────────────────────┐
│ [产品图] 产品名称                      [剪辑][查看] │
│         AI视频: 5 | 可发布: 3 | 已发布: 1          │
└─────────────────────────────────────────────────────┘
```

### 操作按钮

- **剪辑**：触发 cap_cut 剪辑（异步）
- **查看**：进入产品详情页的视频管理 Tab
- **发布**：进入发布选择页面（可多选视频发布）

### 剪辑按钮交互

1. 点击「剪辑」按钮
2. 弹窗确认：「确定对 [产品名称] 执行剪辑？将使用随机背景音乐。」
3. 确认后调用 API，异步提交任务
4. 按钮变为「剪辑中...」并显示加载状态
5. 返回成功后显示 toast：「剪辑任务已提交，请稍后刷新查看」

## 文件结构

```
新建:
- prisma/schema.prisma                           # VideoPush model, MaterialType extension
- app/api/video-push/route.ts                   # GET list, POST clip
- app/api/video-push/[id]/route.ts              # PATCH qualify, DELETE
- app/api/video-push/[id]/publish/route.ts      # POST publish
- app/(app)/daily-publish-plan/page.tsx         # 每日发布计划页面
- lib/capcut.ts                                # cap_cut CLI 调用封装

修改:
- app/(app)/products/[id]/ProductDetail.tsx    # 添加视频管理 Tab
```

## 实现顺序

1. **数据库** - VideoPush 表 + MaterialType 扩展
2. **cap_cut 集成** - CLI 调用封装、异步任务处理
3. **VideoPush API** - CRUD 操作
4. **每日发布计划页面** - 产品列表 + 统计 + 操作按钮
5. **剪辑流程** - 异步任务提交 + 状态刷新

## 注意事项

- cap_cut 是本地 CLI，需要指定可执行文件路径
- 视频存储路径和 URL 前缀需要在配置文件中管理
- 剪辑任务是异步的，需要考虑任务状态跟踪
- 背景音乐随机选择时如果素材库为空，应该给出提示而非静默失败
