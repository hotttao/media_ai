# 素材库管理功能设计

## 1. 概述

本设计描述素材库管理的功能扩展，包括：
1. 动作素材库管理（movement_materials 的 CRUD）
2. 产品素材库查看（product_materials 的查看和删除）

## 2. 动作素材库管理

### 2.1 页面

路径：`/movements`

### 2.2 功能

- **列表展示**：展示所有动作素材
- **类型筛选**：区分文字动作和视频动作
- **创建动作**：弹窗表单，包含：
  - content（动作描述，必填）
  - url（动作视频地址，可选）
  - clothing（穿戴服装描述）
  - scope（适合的服装类型）
- **编辑动作**：同创建
- **删除动作**：确认后删除

### 2.3 API 设计

```
GET    /api/movements          - 获取动作素材列表
POST   /api/movements          - 创建动作素材
GET    /api/movements/[id]     - 获取单个动作素材
PATCH  /api/movements/[id]     - 更新动作素材
DELETE /api/movements/[id]     - 删除动作素材
```

### 2.4 数据模型

```typescript
interface MovementMaterial {
  id: string
  url: string | null      // 动作视频地址
  content: string         // 动作描述（不能为空）
  clothing: string | null // 人物穿戴的服装
  scope: string | null    // 适合的服装类型
  createdAt: Date
}
```

## 3. 产品素材库查看

### 3.1 页面

路径：产品详情页新增 "素材" tab

### 3.2 功能

- **Tab 切换**：商品详情 / 素材
- **素材展示**：展示该产品生成的所有效果图和首帧图
- **图片预览**：点击放大查看
- **删除素材**：确认后删除

### 3.3 API 设计

```
GET    /api/products/[id]/materials - 获取产品的素材列表
DELETE /api/products/[id]/materials/[materialId] - 删除产品素材
```

## 4. UI 设计

### 4.1 动作素材库页面

与现有素材库（/materials）风格一致：
- Hero Section 带统计
- 搜索和筛选
- 卡片网格展示
- 上传/创建弹窗

筛选类型：
- 全部
- 文字动作（无 url）
- 视频动作（有 url）

### 4.2 产品素材 Tab

在产品详情页添加 Tab 组件：
- "商品详情" tab
- "素材" tab

素材展示为网格，区分效果图和首帧图。

## 5. 实现顺序

1. 动作素材 API（CRUD）
2. 动作素材列表页面
3. 产品素材 API
4. 产品详情页素材 Tab
