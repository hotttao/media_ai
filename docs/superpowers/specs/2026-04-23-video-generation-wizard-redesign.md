# 视频生成向导重构设计

## 背景

根据 PRD 4.2，服装视频生成流程需要按以下步骤执行：
1. 选择虚拟 IP
2. 生成模特图
3. 生成定妆图
4. 生成首帧图
5. 生成视频

现有 `GenerateVideoWizard.tsx` 实现与 PRD 不一致，需要重构。

## 设计方案

### 1. 步骤定义

| 步骤 | 名称 | 功能 |
|-----|------|------|
| 1 | 选择虚拟 IP | 从 IP 列表选择 |
| 2 | 模特图 | 选择产品图+细节图，或使用已有模特图 |
| 3 | 定妆图 | 选择姿势+妆容+饰品，或使用已有定妆图 |
| 4 | 首帧图 | 选择场景(图片) + 构图(文字描述)，或使用已有首帧图 |
| 5 | 生成视频 | 选择动作，生成视频 |

### 2. 素材库类型扩展

在 `MaterialType` 枚举中恢复 `POSE` 类型：
```prisma
enum MaterialType {
  SCENE
  POSE      // 新增
  MAKEUP
  ACCESSORY
  OTHER
}
```

### 3. 核心交互逻辑

**每步的两种状态：**
- **选择模式**：用户从已有素材中选择，禁用"生成"按钮
- **生成模式**：用户点击生成工具，生成后自动选中

**互斥规则：**
- 选中已有素材 → 禁用"生成"按钮
- 点击"生成" → 清空已有选择

**已有数据的获取：**
- 模特图：`GET /api/product-materials?productId={id}&ipId={ipId}` 取最新一条 fullBodyUrl
- 定妆图：`GET /api/product-materials?productId={id}&ipId={ipId}` 取所有定妆图（fullBodyUrl）
- 首帧图：`GET /api/product-materials?productId={id}&ipId={ipId}` 取所有首帧图（firstFrameUrl）

### 4. API 改造

**新增端点：**

```
POST /api/products/{id}/model-image
Body: { ipId, productMainImageUrl, productDetailImageUrls[] }
Response: { modelImageUrl, productMaterialId }

POST /api/products/{id}/style-image
Body: { productMaterialId, pose, makeupUrl?, accessoryUrl? }
Response: { styledImageUrl, productMaterialId }
```

**GET 端点扩展：**
```
GET /api/product-materials?productId={id}&ipId={ipId}
Response: ProductMaterial[]
```

**构图处理：**
- 构图为文字描述，非素材
- 输入框让用户输入构图描述，如 "人物居中"、"人物在画面左侧" 等
- 传递给 SceneReplaceTool 作为 prompt 参数

### 5. 组件改造

**GenerateVideoWizard.tsx 步骤调整：**

```typescript
const STEPS = [
  { id: 'select-ip', label: '选择虚拟IP', icon: '🎭' },
  { id: 'model-image', label: '模特图', icon: '👗' },
  { id: 'style-image', label: '定妆图', icon: '💄' },
  { id: 'first-frame', label: '首帧图', icon: '🖼️' },
  { id: 'video', label: '生成视频', icon: '🎥' },
]
```

**每步 UI 要素：**
- 步骤2(模特图)：已有模特图(网格) + 产品图选择 + 细节图选择 + 生成按钮
- 步骤3(定妆图)：已有定妆图(网格) + 姿势选择 + 妆容选择 + 饰品选择 + 生成按钮
- 步骤4(首帧图)：已有首帧图(网格) + 场景选择(图片) + 构图输入(文字) + 生成按钮
- 步骤5(视频)：已有视频(列表) + 动作选择 + 生成按钮
- 底部：下一步按钮（根据选择/生成状态启用/禁用）

### 6. 数据模型

**ProductMaterial 扩展用途：**
- `fullBodyUrl`: 模特图 或 定妆图（取决于当前步骤）
- `firstFrameUrl`: 首帧图

**状态管理：**
```typescript
interface WizardState {
  currentStep: number
  selectedIp: VirtualIp | null
  // 步骤2
  selectedProductMaterial: ProductMaterial | null  // 选中的已有记录
  modelImageUrl: string | null  // 当前生成的模特图
  // 步骤3
  styledImageUrl: string | null  // 当前生成的定妆图
  selectedPose: Material | null
  selectedMakeup: Material | null
  selectedAccessory: Material | null
  // 步骤4
  firstFrameUrl: string | null
  selectedScene: Material | null
  selectedComposition: string | null  // 构图参数
  // 步骤5
  videoUrl: string | null
  selectedMovement: Movement | null
}
```

## 实现计划

1. 数据库迁移：恢复 POSE 枚举类型
2. API 改造：新增 model-image、style-image 端点
3. 组件重构：按新步骤改造 GenerateVideoWizard
4. 素材库集成：支持 POSE 类型上传

## 待确认

- [x] 构图（composition）：作为文字描述输入，非素材类型
