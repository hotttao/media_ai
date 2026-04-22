# 产品生成视频功能设计

## 1. 概述

本设计描述从产品库出发，生成带货视频的完整流程。包括数据模型更新、工具定义、工作流设计和 UI 流程。

## 2. 核心流程

```
用户选择：商品 + IP + 场景 + 姿势
    ↓
双图编辑递归融合：人物图 → +服装 → +场景 → +妆容 → 效果图
    ↓
场景替换：效果图 + 构图 → 首帧图 → 存入 product_materials
    ↓
视频生成：
  - 文字动作 → 图生视频工具（首帧图 + 动作文字 → 视频）
  - 视频动作 → 动作迁移工具（首帧图 + 动作视频 → 视频）
    ↓
视频存入 videos 表（关联 product_id）
```

## 3. 数据模型

### 3.1 product_materials 表（新建）

存储产品与 IP、场景的组合素材，以及生成的效果图和首帧图。

```prisma
model ProductMaterial {
  id            String   @id @default(uuid())
  productId     String   @map("product_id")
  ipId          String?  @map("ip_id")
  sceneId       String?  @map("scene_id")
  fullBodyUrl   String?  @map("full_body_url")    // 效果图（人物+服装）
  threeViewUrl  String?  @map("three_view_url")   // 三视图
  nineViewUrl   String?  @map("nine_view_url")    // 九视图
  firstFrameUrl String?  @map("first_frame_url") // 首帧图（融入构图）
  createdAt     DateTime @default(now()) @map("created_at")

  product Product    @relation("ProductToProductMaterials", fields: [productId], references: [id], onDelete: Cascade)
  ip      VirtualIp? @relation("ProductMaterialToVirtualIp", fields: [ipId], references: [id], onDelete: SetNull)
  scene   Material?  @relation("ProductMaterialToScene", fields: [sceneId], references: [id], onDelete: SetNull)

  @@map("product_materials")
}
```

### 3.2 movement_materials 表（新建）

存储动作素材库，包括动作视频或动作描述。

```prisma
model MovementMaterial {
  id        String   @id @default(uuid())
  url       String?  @db.VarChar(500)  // 动作视频地址（非必须）
  content   String   @db.Text           // 动作的文字描述（不能为空）
  clothing  String?  @db.Text           // 人物穿戴的服装描述
  scope     String?  @db.Text           // 适合的服装类型（如"裙子不适合蹲下动作"）
  createdAt DateTime @default(now()) @map("created_at")

  @@map("movement_materials")
}
```

### 3.3 materials 表类型更新

枚举增加 POSE 类型：

```prisma
enum MaterialType {
  CLOTHING
  SCENE
  ACTION
  MAKEUP
  ACCESSORY
  OTHER
  POSE  // 新增：姿势
}
```

### 3.4 videos 表更新

增加 productId 关联：

```prisma
model Video {
  id         String   @id @default(uuid())
  taskId     String   @map("task_id")
  userId     String   @map("user_id")
  teamId     String   @map("team_id")
  ipId       String?  @map("ip_id")
  productId  String?  @map("product_id")  // 新增
  name       String?  @db.VarChar(100)
  url        String   @db.VarChar(500)
  thumbnail  String?  @db.VarChar(500)
  duration   Int?
  size       BigInt?  @db.BigInt
  createdAt  DateTime @default(now()) @map("created_at")

  product Product? @relation("ProductToVideos", fields: [productId], references: [id], onDelete: SetNull)
  // ... existing relations
}
```

## 4. 工具定义

### 4.1 双图编辑工具（ImageBlend）

将两张图片根据提示词融合。

```typescript
const ImageBlendTool: ToolDefinition = {
  id: 'image-blend',
  name: '双图编辑',
  provider: 'runninghub',
  workflowId: process.env.RUNNINGHUB_WORKFLOW_IMAGE_BLEND || 'image-blend-workflow-id',
  inputs: [
    { name: 'imageA', type: 'image', required: true, description: '基础图片' },
    { name: 'imageB', type: 'image', required: true, description: '融合图片' },
    { name: 'prompt', type: 'text', required: true, description: '融合描述，如"给人物穿上指定的服装"' },
  ],
  outputs: [
    { name: 'result', type: 'image', description: '融合后的图片' },
  ],
}
```

**使用方式**：递归调用，逐步融合
1. 人物图 + 服装图 → 人物穿服装效果图
2. 效果图 + 场景图 → 融入场景图
3. 效果图 + 妆容素材 → 添加妆容

### 4.2 场景替换工具（SceneReplace）

将人物融入构图场景，生成首帧图。

```typescript
const SceneReplaceTool: ToolDefinition = {
  id: 'scene-replace',
  name: '场景替换',
  provider: 'runninghub',
  workflowId: process.env.RUNNINGHUB_WORKFLOW_SCENE_REPLACE || 'scene-replace-workflow-id',
  inputs: [
    { name: 'character', type: 'image', required: true, description: '人物效果图' },
    { name: 'scene', type: 'image', required: true, description: '场景/构图图片' },
  ],
  outputs: [
    { name: 'firstFrame', type: 'image', description: '首帧图（人物融入构图）' },
  ],
}
```

### 4.3 图生视频工具（ImageToVideo）

静态图 + 文字动作描述 → 视频。

```typescript
const ImageToVideoTool: ToolDefinition = {
  id: 'image-to-video',
  name: '图生视频',
  provider: 'runninghub',
  workflowId: process.env.RUNNINGHUB_WORKFLOW_IMAGE_TO_VIDEO || 'image-to-video-workflow-id',
  inputs: [
    { name: 'image', type: 'image', required: true, description: '首帧图' },
    { name: 'actionText', type: 'text', required: true, description: '动作文字描述' },
    { name: 'expression', type: 'text', required: false, description: '表情描述' },
    { name: 'lighting', type: 'text', required: false, description: '光影描述' },
  ],
  outputs: [
    { name: 'video', type: 'video' },
  ],
}
```

### 4.4 动作迁移工具（MotionTransfer）

首帧图 + 动作视频 → 新视频（保留人物外观，复用动作）。

```typescript
const MotionTransferTool: ToolDefinition = {
  id: 'motion-transfer',
  name: '动作迁移',
  provider: 'runninghub',
  workflowId: process.env.RUNNINGHUB_WORKFLOW_MOTION_TRANSFER || 'motion-transfer-workflow-id',
  inputs: [
    { name: 'image', type: 'image', required: true, description: '首帧图' },
    { name: 'actionVideo', type: 'video', required: true, description: '动作视频' },
  ],
  outputs: [
    { name: 'video', type: 'video' },
  ],
}
```

## 5. 工作流设计

### 5.1 效果图生成工作流

```
[人物图] + [服装图] → 双图编辑 → [人物穿服装效果图]
                                  ↓
[效果图] + [场景图] → 双图编辑 → [融入场景效果图]
                                  ↓
[效果图] + [妆容]   → 双图编辑 → [最终效果图]
```

### 5.2 视频生成工作流

根据动作类型选择不同工具：

**文字动作流程：**
```
[首帧图] + [动作文字] → 图生视频 → [视频]
```

**视频动作流程：**
```
[首帧图] + [动作视频] → 动作迁移 → [视频]
```

## 6. UI 流程

在产品详情页增加"生成视频"入口，进入向导流程：

```
┌─────────────────────────────────────────────────────────────┐
│  生成视频向导                                                  │
├─────────────────────────────────────────────────────────────┤
│  Step 1: 选择虚拟 IP                                          │
│  ├─ 展示该用户/团队下的虚拟 IP 列表                            │
│  └─ 用户选择其中一个 IP                                        │
│                                                             │
│  Step 2: 选择场景与姿势                                        │
│  ├─ 从素材库选择场景构图（materials type=SCENE）             │
│  ├─ 从素材库选择姿势（materials type=POSE）                   │
│  └─ 如有需要可选择妆容（materials type=MAKEUP）               │
│                                                             │
│  Step 3: 生成效果图                                           │
│  ├─ 双图编辑融合：人物 + 服装 + 场景 + 妆容                    │
│  ├─ 效果图存入 product_materials.full_body_url                │
│  └─ 用户确认效果图                                            │
│                                                             │
│  Step 4: 选择动作                                             │
│  ├─ 从 movement_materials 选择动作                            │
│  ├─ 支持文字描述动作或视频动作                                  │
│  └─ 系统根据选择判断使用哪个视频生成工具                         │
│                                                             │
│  Step 5: 生成首帧图                                           │
│  ├─ 场景替换：效果图 + 构图 → 首帧图                           │
│  ├─ 首帧图存入 product_materials.first_frame_url              │
│  └─ 用户确认首帧图                                            │
│                                                             │
│  Step 6: 生成视频                                             │
│  ├─ 文字动作 → 图生视频工具                                   │
│  ├─ 视频动作 → 动作迁移工具                                    │
│  └─ 视频存入 videos 表（关联 product_id）                      │
└─────────────────────────────────────────────────────────────┘
```

## 7. API 设计

### 7.1 新增 API

```
POST /api/products/[id]/generate-video
  Body: {
    ipId: string,
    sceneId: string,
    poseId: string,
    makeupId?: string,
    movementId: string,
    compositionId: string  // 构图，即场景素材
  }
  Response: {
    videoId: string,
    videoUrl: string,
    productMaterialId: string
  }
```

### 7.2 更新 API

```
GET /api/products/[id]/materials
  - 返回该产品的 product_materials 列表

POST /api/products/[id]/materials
  - 创建新的 product_material 记录
```

## 8. 实现顺序

1. 数据库迁移：新增 product_materials、movement_materials 表，更新 videos、materials 表
2. 创建工具定义文件
3. 实现 API 路由
4. 实现工作流服务
5. 实现 UI 向导页面
