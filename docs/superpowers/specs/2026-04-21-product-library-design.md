# 产品库功能设计（服装品类）

## 概述

产品库是虚拟 IP 带货视频系统的核心组成部分，为视频生成提供产品素材支持。当前仅针对服装品类设计。

## 数据模型

### Product (产品)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | UUID，主键 |
| name | String | 产品名称 |
| targetAudience | Enum | 适用人群: MENS / WOMENS / KIDS |
| productDetails | Text | 产品特点/细节描述 |
| displayActions | Text | 展示动作，格式: "动作1: xxx\n动作2: yyy" |
| tags | String (JSON) | 产品标签，如 ["春夏", "休闲", "运动"] |
| userId | String | 创建者 ID |
| teamId | String | 团队 ID |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

### ProductImage (产品图片)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | UUID，主键 |
| productId | String | 所属产品 ID，外键 |
| url | String | 图片 URL |
| isMain | Boolean | 是否为主图 |
| order | Int | 显示顺序 |

### 数据库 Schema 变更

在 `prisma/schema.prisma` 中添加：

```prisma
model Product {
  id              String   @id @default(uuid())
  userId          String   @map("user_id")
  teamId          String   @map("team_id")
  name            String   @db.VarChar(200)
  targetAudience  TargetAudience
  productDetails  String?  @db.Text
  displayActions  String?  @map("display_actions") @db.Text
  tags            String?  // JSON stored as String
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  images ProductImage[] @relation("ProductToImages")

  user   User @relation(fields: [userId], references: [id])
  team   Team @relation(fields: [teamId], references: [id])

  @@map("products")
}

model ProductImage {
  id        String  @id @default(uuid())
  productId String  @map("product_id")
  url       String  @db.VarChar(500)
  isMain    Boolean @default(false) @map("is_main")
  order     Int     @default(0)

  product Product @relation("ProductToImages", fields: [productId], references: [id], onDelete: Cascade)

  @@map("product_images")
}

enum TargetAudience {
  MENS
  WOMENS
  KIDS
}
```

## 页面结构

### 1. 产品列表页 `/products`

- 卡片式列表展示产品
- 搜索框：按产品名称搜索
- 筛选器：适用人群下拉选择
- 标签筛选：多选标签
- 新增产品按钮

### 2. 产品详情页 `/products/[id]`

- 展示产品完整信息
- 产品图片画廊（主图 + 细节图）
- 编辑/删除操作

### 3. 产品上传页 `/products/new`

单页表单，字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| 产品名称 | Input | 必填 |
| 适用人群 | Select | MENS / WOMENS / KIDS |
| 产品标签 | MultiSelect | 可选标签 |
| 产品详情 | Textarea | 产品特点描述 |
| 展示动作 | Textarea | 格式: "动作1: xxx\n动作2: yyy" |
| 产品图片 | Image Upload | 主图 + 多张细节图 |

## AI 自动填充功能

### 流程

```
[上传图片] → [点击 "AI 提取信息"] → [Loading] → [自动填充表单]
```

### 图片处理

- 上传图片转为 Base64 直接发送给 AI
- 支持多张图片（1 张主图 + 多张细节图）
- 图片数量: 1-10 张

### AI 提示词

```typescript
const EXTRACT_PRODUCT_INFO_PROMPT = `
分析用户上传的产品图片，提取产品信息用于电商带货视频制作。

请从图片中提取以下信息：

1. 产品名称：根据主图推断产品名称/标题
2. 适用人群：判断是男装(MENS)、女装(WOMENS)还是童装(KIDS)
3. 产品细节：从图片中提取产品特点、特殊设计、做工、面料等细节
4. 展示动作：根据产品特点推荐展示动作，用于视频生成时的动作参考

分析要求：
1. 仔细观察产品特点，特别是细节图中的特色设计
2. 展示动作应该能突出产品卖点
3. 用中文回复，描述要具体

返回格式（JSON）：
{
  "name": "产品名称",
  "targetAudience": "MENS|WOMENS|KIDS",
  "productDetails": "产品特点描述",
  "displayActions": "动作1: 描述\\n动作2: 描述"
}
`
```

### 返回结果处理

- 解析 AI 返回的 JSON
- 自动填充表单对应字段
- 用户可确认或修改
- 如果解析失败，显示原始文本供用户手动填写

## Agent 模块

AI 相关功能放置在 `agent/` 目录：

```
agent/
├── llm.ts                    // 现有 LLM 调用
├── prompts/
│   └── product.ts           // 产品相关的 AI 提示词
└── services/
    └── product-extractor.ts // 产品信息提取服务
```

## 文件清单

### 数据库
- `prisma/schema.prisma` - 添加 Product、ProductImage 模型

### Domain Layer (L2)
- `domains/product/types.ts` - 产品类型定义
- `domains/product/service.ts` - 产品服务
- `domains/product/validators.ts` - 验证规则

### Components (L0/L1)
- `components/product/ProductCard.tsx` - 产品卡片
- `components/product/ProductForm.tsx` - 产品表单（含 AI 填充）
- `components/product/ProductImageUploader.tsx` - 图片上传组件

### Pages (L3)
- `app/(app)/products/page.tsx` - 产品列表页
- `app/(app)/products/[id]/page.tsx` - 产品详情页
- `app/(app)/products/new/page.tsx` - 新增产品页

### API Routes
- `app/api/products/route.ts` - CRUD 接口
- `app/api/products/extract/route.ts` - AI 提取信息接口

### Agent
- `agent/prompts/product.ts` - 产品 AI 提示词
- `agent/services/product-extractor.ts` - 产品信息提取服务

## 实现顺序

1. Prisma schema 更新 + 生成
2. Domain layer (types, service, validators)
3. API routes
4. Components
5. Pages