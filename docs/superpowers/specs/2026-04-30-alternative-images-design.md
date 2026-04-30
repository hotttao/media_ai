---
name: alternative-images-design
description: 备选图功能设计 - 记录所有生成的图片/视频，用户可选择确认最终使用哪张
status: approved
created: 2026-04-30T13:37:30Z
updated: 2026-04-30T13:37:30Z
---

# 备选图功能设计

## 概述

记录所有生成的图片/视频（AI生成或用户上传），不丢失。用户可以从备选图中选择确认最终使用哪张。

## 用户流程

### 生成/上传流程

1. **用户上传**：
   - 创建正式记录（如 `first_frames`）
   - 创建备选记录（`source=USER_UPLOADED, relatedId=正式记录ID, isConfirmed=true`）
   - 上传后自动成为正式记录

2. **AI 生成**：
   - 创建正式记录（如 `first_frames`，URL 可为空或占位符）
   - 创建备选记录（`source=AI_GENERATED, relatedId=正式记录ID, isConfirmed=false`）
   - 备选记录在正式记录下

### 确认选择流程

1. 用户在向导页面或素材 Tab 查看备选图列表
2. 点击某张备选图确认
3. 用备选图的 URL 更新正式记录的 URL
4. 备选记录 `isConfirmed` 设为 true
5. 原正式记录的 URL 被替换

### 重选流程

1. 用户在备选图列表中选择另一张
2. 确认后，用新选中备选图的 URL 更新正式记录
3. 之前的备选图仍保留在备选表中

## 数据模型

### 新建表：alternative_images

```sql
CREATE TABLE alternative_images (
  id              VARCHAR(36) PRIMARY KEY,
  material_type   ENUM('MODEL_IMAGE', 'STYLE_IMAGE', 'FIRST_FRAME', 'VIDEO') NOT NULL,
  related_id      VARCHAR(36) NOT NULL,
  url             VARCHAR(500) NOT NULL,
  source          ENUM('AI_GENERATED', 'USER_UPLOADED') NOT NULL,
  is_confirmed    BOOLEAN DEFAULT false,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_related_id (related_id),
  INDEX idx_material_type (material_type),
  INDEX idx_is_confirmed (is_confirmed)
);
```

### 字段说明

| 字段 | 类型 | 说明 |
|-----|------|-----|
| id | VARCHAR(36) | 主键 UUID |
| materialType | ENUM | 素材类型：模特图、定妆图、首帧图、视频 |
| relatedId | VARCHAR(36) | 关联的正式记录 ID |
| url | VARCHAR(500) | 素材 URL |
| source | ENUM | 来源：AI生成、用户上传 |
| isConfirmed | BOOLEAN | 是否已确认（true = 该备选图已是正式记录） |
| createdAt | DATETIME | 创建时间 |

## API 设计

### 1. 获取备选图列表

```
GET /api/alternative-images?materialType=FIRST_FRAME&relatedId=xxx
```

响应：
```json
{
  "alternatives": [
    {
      "id": "xxx",
      "materialType": "FIRST_FRAME",
      "relatedId": "yyy",
      "url": "http://...",
      "source": "AI_GENERATED",
      "isConfirmed": false,
      "createdAt": "2026-04-30T10:00:00Z"
    }
  ]
}
```

### 2. 确认备选图

```
POST /api/alternative-images/:id/confirm
```

请求：
```json
{
  "正式记录URL"
}
```

响应：
```json
{
  "success": true,
  "confirmedUrl": "http://..."
}
```

### 3. 上传备选图（用户上传）

```
POST /api/alternative-images/upload
```

请求：
```json
{
  "materialType": "FIRST_FRAME",
  "relatedId": "yyy",
  "url": "http://uploaded..."
}
```

响应：
```json
{
  "id": "xxx",
  "materialType": "FIRST_FRAME",
  "relatedId": "yyy",
  "url": "http://uploaded...",
  "source": "USER_UPLOADED",
  "isConfirmed": true,
  "createdAt": "2026-04-30T10:00:00Z"
}
```

## 页面布局

### 素材 Tab 中的备选图展示

```
┌─────────────────────────────────────────────────────┐
│  首帧图 (3)                                         │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                  │
│  │ IMG │ │ IMG │ │ IMG │ │ IMG │                  │
│  │ ✓   │ │     │ │     │ │     │ ← ✓表示已确认     │
│  └─────┘ └─────┘ └─────┘ └─────┘                  │
│                                          [查看备选] │
└─────────────────────────────────────────────────────┘
```

点击"查看备选"展开备选图列表：

```
┌─────────────────────────────────────────────────────┐
│  首帧图 (3) + 备选图 (5)                            │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ...      │
│  │ IMG │ │ IMG │ │ IMG │ │ IMG │ │ IMG │          │
│  │ ✓   │ │     │ │     │ │     │ │     │          │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘          │
│                                              [收起] │
└─────────────────────────────────────────────────────┘
```

## 实现顺序

1. **数据库**：添加 `alternative_images` 表和正式记录表的关联字段
2. **API**：创建备选图 CRUD API
3. **前端**：在素材 Tab 添加备选图展示
4. **集成**：在生成/上传流程中写入备选表

## 注意事项

- AI 生成时，正式记录可能 URL 为空，需要后续确认时填充
- 确认操作是替换正式记录的 URL，不是移动文件
- 备选表记录永久保留，用户可多次重选
- 上传和 AI 生成走同一接口，source 字段区分来源
