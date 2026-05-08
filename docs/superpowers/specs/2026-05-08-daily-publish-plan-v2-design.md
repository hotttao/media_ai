# 当日发布计划 V2 设计文档

## 1. 背景与问题

### 现状问题

当前 `VideoPush` 表设计中，`ipId` 是必填字段。但实际业务流程中：
- 用户从产品主页添加商品到当日发布计划时，还不知道要用哪个 IP
- 一个产品可以同时被多个 IP 发布
- 需要在查看当日发布计划时，为每个 IP 指定发布计划

### 核心诉求

1. **产品级别管理**：当日发布计划以产品为中心
2. **IP 独立发布计划**：一个产品 × 一个 IP = 一个独立发布计划单元
3. **灵活的视频选择**：在 IP 详情页选择具体视频发布
4. **追素材能力**：复用该 IP 历史发布效果好的商品

## 2. 数据模型设计

### 2.1 新增 DailyPlanProduct 表

```prisma
model DailyPlanProduct {
  id          String   @id @default(uuid())
  productId   String   @map("product_id")
  date        DateTime @map("date") @db.Date
  createdAt   DateTime @default(now())

  @@unique([productId, date], map: "idx_daily_plan_product")
  @@map("daily_plan_products")
}
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 主键 UUID |
| productId | String | 产品 ID |
| date | DateTime | 计划日期（仅保留日期部分） |
| createdAt | DateTime | 创建时间 |

### 2.2 VideoPush 表（保持不变）

```prisma
model VideoPush {
  id              String   @id @default(uuid())
  videoId         String   @map("video_id") @db.VarChar(500)
  videoIdHash     String   @map("video_id_hash")
  productId       String   @map("product_id")
  ipId            String   @map("ip_id")
  sceneId         String   @map("scene_id")
  templateName    String?  @map("template_name")
  musicId         String?  @map("music_id")
  url             String   @default("") @db.VarChar(500)
  thumbnail       String?  @db.VarChar(500)
  status          String   @default("pending")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([productId, ipId, sceneId, videoIdHash], map: "idx_video_push_source")
  @@index([videoId], map: "idx_video_push_video")
  @@map("video_pushes")
}
```

**与 DailyPlanProduct 的关系：**
- `DailyPlanProduct`：产品级别，记录"某产品加入了某日计划"
- `VideoPush`：IP 发布计划级别，记录"某产品+某IP 的具体发布任务"
- 两者通过 `productId` 关联

## 3. 页面设计

### 3.1 当日发布计划主页（全部视图）

**URL：** `/daily-publish-plan`

**功能：** 显示产品列表 + IP 勾选框，不显示具体视频

**页面结构：**

```
┌─────────────────────────────────────────────────────────────────┐
│  📅 2026-05-08 当日发布计划                    [<] [今日] [>]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [全部]  [IP-A]  [IP-B]  [+ 添加 IP 发布计划]                   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  雪纺连衣裙                                                ─────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ☑ IP-A                              ▶                   │  │
│  │  ☑ IP-B                              ▶                   │  │
│  │  □ IP-C                              ▶                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  宽松T恤                                                   ─────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ☑ IP-A                              ▶                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**交互逻辑：**

| 操作 | 结果 |
|------|------|
| 点击 IP-A 前的 **☑/□** | 勾选/取消该 IP 是否参与发布计划 |
| 点击 IP-A 后的 **▶** | 进入 IP-A 详情页 |
| 点击 **[+ 添加 IP 发布计划]** | 在当前产品下新增一行 IP 行（从已有 IP 中选择） |

### 3.2 IP 详情页

**URL：** `/daily-publish-plan?ipId=xxx&productId=yyy`

**功能：** 管理该 IP 下的具体视频、添加商品、剪辑等

**页面结构：**

```
┌─────────────────────────────────────────────────────────────────┐
│  ← 返回  IP-A 发布计划                     [编辑] [删除]        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  产品：雪纺连衣裙                                                │
│                                                                 │
│  已选 2/5 个视频                                                 │
│  [剪辑] [新增] [选择发布视频] [添加商品]                        │
│                                                                 │
│  ┌─ 视频列表 ────────────────────────────────────────────────┐  │
│  │ ○ video_001 (已发布)                                    │  │
│  │ ● video_002 (待发布) ← 已选                             │  │
│  │ ○ video_003 (待发布)                                    │  │
│  └─────────────────────────────────────────────────────────│  │
│                                                                 │
│  [确认发布计划]                                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**操作按钮说明：**

| 按钮 | 功能 |
|------|------|
| **剪辑** | 调用剪辑工具，生成新视频 |
| **新增** | 为该产品+IP 生成新的 AI 视频 |
| **选择发布视频** | 从视频列表中选择具体视频加入发布计划 |
| **添加商品** | 追加该 IP 历史发布过的商品（追素材） |

### 3.3 添加商品弹窗

**触发：** 点击 IP 详情页的 [添加商品] 按钮

**页面结构：**

```
┌─────────────────────────────────────────────────────────────────┐
│  为 IP-A 添加商品                                              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🔍 搜索商品名称...                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  筛选：[全部] [已发布] [商品库]                                │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ○ 复古连衣裙        (该IP历史发布 3 次，数据好 ⭐)       │   │
│  │ ○ 碎花上衣          (该IP历史发布 1 次)                  │   │
│  │ ○ 雪纺连衣裙        (已加入当日计划)                    │   │
│  │ ○ 宽松T恤          (商品库 - 未发布过)                  │   │
│  │ ○ 牛仔短裤          (商品库 - 未发布过)                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  说明：已发布商品复用该IP历史数据，新视频效果更好              │
│                                                                 │
│                              [取消]  [确认添加]                │
└─────────────────────────────────────────────────────────────────┘
```

**筛选说明：**

| 筛选 | 含义 | 列表内容 |
|------|------|----------|
| **全部** | 所有商品 | 已发布商品 + 商品库商品 |
| **已发布** | 该IP发布过的商品 | 只显示该IP历史发布过的（带⭐标记） |
| **商品库** | 未发布的商品 | 只显示从未发布过的 |

**商品项标识：**

| 标识 | 含义 |
|------|------|
| (该IP历史发布 n 次，数据好 ⭐) | 已发布，有历史数据，效果好 |
| (该IP历史发布 n 次) | 已发布，无特殊标记 |
| (已加入当日计划) | 已加入计划但未发布 |
| (商品库 - 未发布过) | 全新商品 |

## 4. 业务流程

### 4.1 添加商品到当日计划

```
1. 用户在产品主页点击 [加入当日发布计划]
2. 创建 DailyPlanProduct 记录
   - productId: 产品ID
   - date: today
3. 创建初始的 VideoPush 记录（ipId 可选）
   - 或仅创建 DailyPlanProduct，后续在详情页添加 IP
```

### 4.2 查看与配置发布计划

```
1. 进入当日发布计划主页
2. 查看产品列表，勾选需要发布的 IP
3. 点击 IP 行的 ▶ 进入详情页
4. 在详情页选择具体视频
5. 点击 [确认发布计划]
```

### 4.3 追素材流程

```
1. 在 IP 详情页点击 [添加商品]
2. 弹窗显示该 IP 历史发布过的商品
3. 选择商品后，跳转到产品生图页面
4. 生成新视频后自动加入该 IP 的发布计划
```

## 5. API 设计

### 5.1 获取当日发布计划产品列表

```
GET /api/daily-publish-plan/{date}/products

Response:
{
  "products": [
    {
      "productId": "xxx",
      "productName": "雪纺连衣裙",
      "ips": [
        { "ipId": "IP-A", "selected": true, "videoCount": 5 },
        { "ipId": "IP-B", "selected": true, "videoCount": 3 }
      ]
    }
  ]
}
```

### 5.2 获取 IP 详情

```
GET /api/daily-publish-plan/{date}/ip-detail?productId=xxx&ipId=yyy

Response:
{
  "productId": "xxx",
  "ipId": "yyy",
  "selectedVideos": ["video_002"],
  "videos": [
    { "id": "video_001", "status": "published" },
    { "id": "video_002", "status": "pending" },
    { "id": "video_003", "status": "pending" }
  ]
}
```

### 5.3 添加商品（追素材）

```
GET /api/products/search?ipId=xxx&filter=published

Response:
{
  "products": [
    { "productId": "xxx", "name": "复古连衣裙", "publishCount": 3, "hasGoodData": true }
  ]
}
```

### 5.4 分配 IP 到产品

```
POST /api/daily-publish-plan/assign-ip
{
  "productId": "xxx",
  "ipId": "yyy",
  "date": "2026-05-08"
}
```

## 6. 数据库迁移

### 6.1 创建 DailyPlanProduct 表

```sql
CREATE TABLE daily_plan_products (
  id VARCHAR(36) PRIMARY KEY DEFAULT uuid(),
  product_id VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY idx_daily_plan_product (product_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 6.2 索引优化

```sql
-- VideoPush 按 IP 查询优化
CREATE INDEX idx_video_push_ip ON video_pushes(ip_id);

-- DailyPlanProduct 按日期查询
CREATE INDEX idx_daily_plan_product_date ON daily_plan_products(date);
```

## 7. 状态定义

### 7.1 VideoPush.status

| 状态 | 含义 |
|------|------|
| pending | 待处理 |
| clipping | 剪辑中 |
| completed | 已完成 |
| failed | 失败 |

### 7.2 发布计划选中状态

| 状态 | 含义 |
|------|------|
| unselected (□) | 未选中，不参与发布 |
| selected (☑) | 已选中，参与发布 |

## 8. 设计原则

1. **产品为中心**：当日发布计划以产品为基本单位展示
2. **IP 独立单元**：一个产品 × 一个 IP = 独立发布计划单元
3. **分层展示**：主页显示勾选，详情页显示视频
4. **追素材能力**：支持复用历史数据好的商品
5. **渐进式交互**：从全部视图 → IP详情 → 选择视频 → 确认发布
