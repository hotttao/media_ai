---
name: video-wizard-design
description: 生视频向导设计 - 显示首帧图×动作组合，支持筛选和批量生成
status: approved
created: 2026-04-30T11:54:43Z
updated: 2026-04-30T11:54:43Z
---

# 生视频向导设计

## 概述

在产品详情页添加"生视频"按钮，点击进入生视频向导页面。该页面显示该产品下所有首帧图 × 动作的组合，按生成状态筛选，支持批量选择和生成。

## 用户流程

1. 用户在产品详情页点击"生视频"按钮
2. 进入 `/products/[id]/video-wizard` 页面
3. 页面加载所有首帧图 × 动作组合
4. 用户可通过筛选菜单过滤（全部/已生成/未生成）
5. 用户为每个首帧图选择可用的动作（多选）
6. 点击全选或生成按钮批量生成

## 页面布局

```
┌────────────────────────────────────────────────────┐
│ ← 返回              生视频向导                       │
├────────────────────────────────────────────────────┤
│ 筛选: [全部] [已生成] [未生成]                      │
├────────────────────────────────────────────────────┤
│ 首帧图              可用动作（姿势过滤）              │
│ ┌────────┐                                            │
│ │ 图片   │ 首帧图1   [走路✓] [跑步] [跳舞✓]          │
│ └────────┘                                            │
│ ┌────────┐                                            │
│ │ 图片   │ 首帧图2   [挥手] [转身✓]                  │
│ └────────┘                                            │
├────────────────────────────────────────────────────┤
│                                    [全选] [生成(3)] │
└────────────────────────────────────────────────────┘
```

## 数据获取

### API 调用
- `GET /api/tools/combination/jimeng-videos` - 获取所有首帧图×动作组合

### 数据过滤
- 前端根据筛选条件过滤：
  - 全部：显示所有组合
  - 已生成：只显示 `existingVideoId !== null` 的组合
  - 未生成：只显示 `existingVideoId === null` 的组合

### 动作过滤
- 每个首帧图的姿势（poseId）过滤可用动作
- 只显示 `isGeneral=true` 或关联该姿势的动作

## 组合数据格式

```typescript
interface VideoCombination {
  id: string                    // "firstFrameId-movementId"
  firstFrame: {
    id: string
    url: string
    poseId: string
  }
  movement: {
    id: string
    content: string
  }
  existingVideoId: string | null  // null = 未生成
}
```

## 功能

### 1. 筛选菜单
- 三个选项：全部 / 已生成 / 未生成
- 点击切换，当前选项高亮
- 切换后重新显示过滤后的列表

### 2. 首帧图行
- 显示首帧图缩略图
- 右侧显示该首帧图可用的动作列表
- 动作标签可点击切换选中状态
- 已生成的动作显示不同样式（已选但不可取消）

### 3. 动作多选
- 每个动作标签可点击切换
- 选中状态：`border-matcha-600 bg-matcha-50`
- 未选中：`border-oat hover:border-matcha-400`
- 已生成的动作自动标记为已选

### 4. 全选
- 点击"全选"选中所有待生成的组合（existingVideoId === null）
- 再次点击"取消全选"

### 5. 批量生成
- 点击"生成"按钮
- 对所有选中的待生成组合调用 API
- 已生成的组合需要弹窗确认

### 6. 确认弹窗
- 如果选中的组合包含已生成的，弹出确认框
- 内容："有 {n} 个视频已生成，确定要重新生成吗？"
- 确认后继续生成，取消则中止

## API 调用

### 生成请求
```typescript
POST /api/tools/combination/generate
{
  type: "jimeng-video",
  firstFrameId: string,
  movementId: string
}
```

## 文件结构

```
app/(app)/products/[id]/
├── video-wizard/
│   └── page.tsx    # 向导页面
```

## 修改文件

- `app/(app)/products/[id]/ProductDetail.tsx`  # 添加生视频按钮

## 实现顺序

1. 创建页面组件 `video-wizard/page.tsx`
2. 在产品详情页添加"生视频"按钮