---
name: jimeng-video-design
description: 即梦生视频工具设计 - 首帧图×动作组合生成视频
status: approved
created: 2026-04-30T09:35:42Z
updated: 2026-04-30T09:35:42Z
---

# 即梦生视频工具设计

## 概述

即梦生视频工具允许用户选择首帧图和动作（movement）组合，调用即梦接口生成视频。动作需要根据首帧图的姿势进行过滤，确保只有与姿势匹配的动作才能组合。

## 用户流程

1. 用户选择**首帧图**（多选）
2. 系统根据首帧图的姿势（styleImage.poseId）过滤可用**动作**
3. 用户选择**动作**（多选）
4. 系统计算组合：`首帧图 × 动作`，过滤已生成视频的组合
5. 用户点击生成

## 数据模型

### 首帧图 → 姿势链

```
FirstFrame.styleImageId → StyleImage.poseId → Material (POSE)
```

### 动作过滤

```
MovementMaterial 通过 PoseMovement 关联表与 Material (POSE) 关联
动作过滤条件：isGeneral = true OR poseId 在选中首帧图的姿势列表中
```

## API 设计

### GET /api/tools/combination/jimeng-videos

返回可用的即梦生视频组合。

**响应**：
```json
[
  {
    "id": "combo_1",
    "firstFrame": {
      "id": "ff_123",
      "url": "https://...",
      "poseId": "pose_456"
    },
    "movement": {
      "id": "mov_789",
      "content": "走路动作描述"
    },
    "existingVideoId": "vid_abc"
  }
]
```

### POST /api/tools/combination/generate

扩展支持 `jimeng-video` 类型：

```json
{
  "type": "jimeng-video",
  "firstFrameId": "ff_123",
  "movementId": "mov_789"
}
```

**调用即梦接口**：
```
POST http://127.0.0.1:8765/v1/single/jimeng-video

{
  "productId": "prod_001",
  "ipId": "ip_001",
  "firstFrameId": "ff_abc",
  "movementId": "mov_xyz",
  "prompt": "动作的 content 字段",
  "force": false
}
```

注：`productId` 和 `ipId` 从首帧图关联获取。

## 页面布局

参考 `jimeng-image/page.tsx` 的布局：

1. **首帧图选择区**（多选）- 卡片式，展示 url
2. **动作选择区**（多选）- 列表式，仅显示与选中首帧图姿势匹配的动作
3. **组合预览区** - 实时显示 `首帧图 × 动作` 组合
4. **生成按钮** - 底部

## 数据库记录

生成视频后，在 `Video` 表中创建记录，关联：
- `firstFrameId` = 选中的首帧图 ID
- `movementId` = 选中的动作 ID
- `ipId`, `productId` = 从首帧图关联获取

## 依赖文件

### 新建
- `app/api/tools/combination/jimeng-videos/route.ts` - 获取可用组合
- `app/(app)/tools/jimeng-video/page.tsx` - 工具页面

### 修改
- `app/api/tools/combination/generate/route.ts` - 添加 jimeng-video 类型处理
- `app/api/tools/route.ts` - 添加工具到列表

## 实现顺序

1. 后端 API：`GET /api/tools/combination/jimeng-videos`
2. 后端 API：扩展 `POST /api/tools/combination/generate`
3. 前端页面：`jimeng-video/page.tsx`
4. 添加工具到列表
