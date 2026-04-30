---
name: model-images-wizard-design
description: 模特图生成向导页面设计 - 显示IP×产品组合，支持批量生成
status: approved
created: 2026-04-30T11:33:32Z
updated: 2026-04-30T11:33:32Z
---

# 模特图生成向导页面设计

## 概述

在产品详情页添加"生图向导"按钮，点击进入模特图生成向导页面。该页面显示该产品下所有 IP × 产品 组合，标记生成状态，支持批量选择和生成。

## 用户流程

1. 用户在产品详情页点击"生图向导"按钮
2. 进入 `/products/[id]/model-images-wizard` 页面
3. 页面加载所有 IP × 产品 组合
4. 用户可切换 IP 查看不同组合
5. 用户多选或全选未生成的组合
6. 点击生成按钮批量生成

## 页面布局

```
┌─────────────────────────────────────────────┐
│ ← 返回         模特图生成向导               │
├─────────────────────────────────────────────┤
│ 当前产品: [产品名称]                         │
├─────────────────────────────────────────────┤
│ 虚拟IP选择:                                 │
│ [IP卡片1] [IP卡片2] [IP卡片3] ...          │
├─────────────────────────────────────────────┤
│ 组合列表:                        [全选] [生成]│
│ ┌─────────────────────────────────────────┐│
│ │ ☐ IP1 × 产品A    ✓ 已生成              ││
│ │ ☑ IP1 × 产品B    ○ 待生成              ││
│ │ ☑ IP1 × 产品C    ○ 待生成              ││
│ │ ...                                     ││
│ └─────────────────────────────────────────┘│
│ 已选择: 2/3                                │
└─────────────────────────────────────────────┘
```

## 数据获取

### API 调用
- `GET /api/tools/combination/model-images` - 获取所有可用组合

### 数据过滤
- 前端根据当前产品的 productId 过滤组合
- 只显示属于当前产品的组合

## 组合数据格式

```typescript
interface ModelImageCombination {
  id: string                    // "ipId-productId"
  ip: {
    id: string
    nickname: string
    fullBodyUrl: string | null
  }
  product: {
    id: string
    name: string
    mainImageUrl: string | null
  }
  existingModelImageId: string | null  // null = 未生成
}
```

## 功能

### 1. IP 切换
- 顶部展示 IP 卡片列表（单选）
- 切换 IP 后，组合列表显示该 IP 与所有产品的组合
- 默认选中第一个 IP

### 2. 组合列表
- 显示当前 IP 下所有产品组合
- 每行显示：复选框 + IP图 + 产品图 + 状态标签
- 状态标签：
  - `✓ 已生成` - 绿色，已存在的组合
  - `○ 待生成` - 灰色，未存在的组合

### 3. 全选/取消全选
- 点击"全选"按钮选中所有待生成的组合
- 再次点击"取消全选"

### 4. 批量生成
- 点击"生成"按钮
- 对所有选中的待生成组合调用 API
- 成功后刷新页面

## API 调用

### 生成请求
```typescript
POST /api/tools/combination/generate
{
  type: "model-image",
  ipId: string,
  productId: string
}
```

## 文件结构

```
app/(app)/products/[id]/
├── model-images-wizard/
│   └── page.tsx    # 向导页面
```

## 实现顺序

1. 创建页面组件 `model-images-wizard/page.tsx`
2. 在产品详情页添加入口按钮
