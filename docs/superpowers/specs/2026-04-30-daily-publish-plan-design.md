---
name: daily-publish-plan-design
description: 当日发布计划功能设计 - 浮窗购物车形式添加产品到每日发布计划
status: approved
created: 2026-04-30T12:28:59Z
updated: 2026-04-30T12:28:59Z
---

# 当日发布计划功能设计

## 概述

在产品详情页和产品列表页添加"加入当日发布计划"按钮，右上角显示浮窗购物车，用户可以添加产品到当天的发布计划，查看已添加的产品列表，并移除不需要的产品。

## 用户流程

1. **产品详情页单个添加**：用户点击产品详情页的"加入发布计划"按钮，产品被添加到当天的发布计划
2. **产品列表页批量添加**：用户勾选多个产品，点击"加入发布计划"按钮，批量添加到当天的发布计划
3. **查看浮窗**：用户点击右下角浮窗，展开查看当天已添加的产品列表
4. **移除产品**：在浮窗内可以移除单个产品
5. **查看详情**：点击"查看发布计划"跳转到发布计划详情页

## 数据模型

### 新建表：daily_publish_plan

```sql
CREATE TABLE daily_publish_plan (
  id          VARCHAR(36) PRIMARY KEY,                              -- 唯一标识符 UUID
  user_id     VARCHAR(36) NOT NULL,                                  -- 用户 ID
  product_id  VARCHAR(36) NOT NULL,                                  -- 产品 ID
  plan_date   DATE NOT NULL,                                        -- 计划日期
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,                   -- 添加时间
  UNIQUE KEY uk_user_product_date (user_id, product_id, plan_date),  -- 唯一约束
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

### 字段说明

| 字段 | 类型 | 说明 |
|-----|------|-----|
| id | VARCHAR(36) | 主键 UUID |
| userId | VARCHAR(36) | 用户 ID |
| productId | VARCHAR(36) | 产品 ID |
| planDate | DATE | 计划日期 |
| createdAt | DATETIME | 添加时间 |

**唯一约束**：(userId, productId, planDate) - 同一用户同一产品同一天只能添加一次

## API 设计

### 获取当天发布计划

```
GET /api/daily-publish-plan?date=YYYY-MM-DD
```

响应：
```json
{
  "plans": [
    {
      "id": "xxx",
      "productId": "xxx",
      "productName": "产品名称",
      "productImage": "http://...",
      "planDate": "2026-04-30",
      "createdAt": "2026-04-30T10:00:00Z"
    }
  ],
  "count": 1
}
```

### 添加产品到发布计划

```
POST /api/daily-publish-plan
```

请求：
```json
{
  "productId": "xxx",
  "planDate": "2026-04-30"
}
```

响应：
```json
{
  "id": "xxx",
  "productId": "xxx",
  "planDate": "2026-04-30",
  "createdAt": "2026-04-30T10:00:00Z"
}
```

### 批量添加产品到发布计划

```
POST /api/daily-publish-plan/batch
```

请求：
```json
{
  "productIds": ["xxx", "yyy"],
  "planDate": "2026-04-30"
}
```

响应：
```json
{
  "added": 2,
  "skipped": 0,
  "errors": []
}
```

### 从发布计划移除产品

```
DELETE /api/daily-publish-plan/:id
```

响应：
```json
{
  "success": true
}
```

## 页面布局

### 浮窗组件位置

```
┌────────────────────────────────────────────────────┐
│                                            ┌────┐  │
│                                            │ 🛒 │  │  ← 右下角浮窗
│                                            └────┘  │
└────────────────────────────────────────────────────┘

点击展开后:
┌────────────────────────────────────────────────────┐
│                                            ┌────────────┐
│                                            │  当日发布  │  │
│                                            │  ┌──────┐  │
│                                            │  │产品1 │  │
│                                            │  └──────┘  │
│                                            │  ┌──────┐  │
│                                            │  │产品2 │  │
│                                            │  └──────┘  │
│                                            │  [查看计划]│
│                                            └────────────┘
└────────────────────────────────────────────────────┘
```

### 浮窗展开状态

```
┌─────────────────┐
│ 当日发布计划    │  ← 标题
│ ┌─────────────┐ │
│ │ [图片] 产品1 │ │  ← 产品缩略图 + 名称
│ │          ×  │ │  ← 移除按钮
│ └─────────────┘ │
│ ┌─────────────┐ │
│ │ [图片] 产品2 │ │
│ │          ×  │ │
│ └─────────────┘ │
│ [查看发布计划]  │  ← 跳转链接
└─────────────────┘
```

## 功能

### 1. 产品详情页入口

在产品详情页的按钮组添加"加入发布计划"按钮：

```tsx
<button
  onClick={handleAddToPublishPlan}
  disabled={isAdding}
  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3.5 font-medium text-white shadow-lg shadow-emerald-500/30 transition-all duration-300 hover:from-emerald-400 hover:to-teal-500 hover:shadow-emerald-500/50 group active:scale-[0.98] disabled:opacity-50"
>
  {isAdding ? (
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
  ) : (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  )}
  加入发布计划
</button>
```

### 2. 产品列表页入口

在产品列表页添加：
- 每行产品卡片有多选框
- 顶部工具栏有"加入发布计划"批量按钮

### 3. 浮窗组件

- **收起状态**：右下角显示购物车图标 + 角标（已添加产品数量）
- **展开状态**：显示产品列表，每项有图片、名称、移除按钮
- **底部**：显示"查看发布计划"链接

### 4. 状态管理

使用 React Context 或 Zustand 管理：
- 当前日期的发布计划列表
- 浮窗展开/收起状态
- 加载状态

## 文件结构

```
新建:
- app/api/daily-publish-plan/route.ts      # API 路由
- components/daily-publish-plan/DailyPublishPlanFloating.tsx  # 浮窗组件
- app/(app)/daily-publish-plan/page.tsx   # 发布计划详情页（可选）

修改:
- app/(app)/products/[id]/ProductDetail.tsx  # 添加单个添加按钮
- app/(app)/products/page.tsx                # 添加批量选择和添加
```

## 实现顺序

1. 创建数据库表和 Prisma schema 更新
2. 创建 API 路由（CRUD）
3. 创建浮窗组件
4. 在产品详情页添加入口按钮
5. 在产品列表页添加批量选择和入口按钮

## 注意事项

- 同一产品同一天只能添加一次（数据库唯一约束）
- 浮窗需要响应式，在移动端也正常工作
- 添加成功/失败需要 toast 提示
- 浮窗需要获取当前登录用户信息
