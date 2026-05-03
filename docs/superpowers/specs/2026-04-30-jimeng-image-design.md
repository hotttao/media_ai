---
name: jimeng-image-design
description: 即梦生图工具设计 - 人物×服装×姿势×场景组合生成
status: approved
created: 2026-04-30T08:50:58Z
updated: 2026-04-30T08:50:58Z
---

# 即梦生图工具设计

## 概述

即梦生图工具允许用户通过组合人物（IP）、服装（产品）、姿势（pose）和场景（scene）来生成首帧图。该工具复用水印生成的模特图，保持与 GPT 生图流程一致的数据追溯链路。

## 用户流程

1. 用户选择**人物**（单选）
2. 用户选择**服装**（多选，仅显示未生成过模特图的）
3. 系统过滤：只显示人物×服装组合中有 modelImageId 的
4. 用户选择**姿势**（多选）
5. 用户选择**场景**（多选）
6. 系统计算组合：`人物 × 服装 × 姿势 × 场景`，过滤已生成的
7. 用户点击生成

## 生成流程

对每个待生成的组合：

1. **查找 modelImageId**：从人物×服装组合中找到已有的 modelImageId（必须存在，否则跳过）
2. **创建 styleImageId**：如果数据库没有对应的 styleImageId，则在数据库中创建虚假记录（无实际图片）。如果 GPT 已经生成了对应的 styleImageId，则直接使用。
   - `styleImageId = hash(modelImageId + pose描述)`
   - `url = ""` 或默认值
3. **调用即梦接口**：
   ```json
   POST http://localhost:8765/v1/single/jimeng-image
   {
     "styleImageId": "生成的styleImageId",
     "sceneId": "选择的场景ID",
     "poseId": "姿势ID",
     "force": false
   }
   ```

## 过滤逻辑

- **服装过滤**：只显示没有生成过模特图的（复用 model-image 的 existingSet 逻辑）
- **组合过滤**：已生成过首帧图的组合（styleImageId + sceneId）标记为 `generated` 状态，不允许重复生成

## 数据库记录

### styleImageId 创建逻辑

当不存在对应的 styleImageId 记录时，创建虚假记录：

```typescript
// 虚假 styleImageId 生成规则
const styleImageId = hashStrings([modelImageId, poseText])
// 例如：hashStrings(["model_123", "站立姿势"]) → "style_abc123"

const styleImage = await db.styleImage.create({
  data: {
    id: styleImageId,
    modelImageId: modelImageId,
    poseId: poseId,
    poseText: poseText,  // pose 的文字描述
    url: "",              // 虚假记录，无实际图片
    // ... 其他必填字段
  }
})
```

### 追踪链路

```
ModelImage (GPT生成)
  ↓
StyleImage (虚假记录：modelImageId + pose描述)
  ↓
FirstFrame (即梦生成：styleImageId + poseId + sceneId)
```

这样保证可以从首帧图反向追溯到模特图和定妆图。

## API 设计

### GET /api/tools/combination/jimeng-images

返回可用的即梦生图组合。

**响应**：
```json
[
  {
    "id": "combo_1",
    "ip": { "id": "ip_1", "nickname": "IP名称", "fullBodyUrl": "..." },
    "product": { "id": "prod_1", "name": "产品名称", "mainImageUrl": "..." },
    "modelImageId": "model_123",           // 必须存在
    "pose": { "id": "pose_1", "name": "姿势名称", "text": "站立姿势" },
    "scene": { "id": "scene_1", "name": "场景名称", "url": "..." },
    "existingFirstFrameId": "ff_123"      // null 表示未生成
  }
]
```

### POST /api/tools/combination/generate

扩展支持 `jimeng-image` 类型：

```json
{
  "type": "jimeng-image",
  "ipId": "ip_1",
  "productId": "prod_1",
  "modelImageId": "model_123",
  "poseId": "pose_1",
  "sceneId": "scene_1"
}
```

## 页面布局

参考 `model-image/page.tsx` 的布局：

1. **人物选择区**（单选）- 卡片式，展示 fullBodyUrl
2. **服装选择区**（多选）- 网格卡片式，仅显示未生成模特图的
3. **姿势选择区**（多选）- 列表或卡片式
4. **场景选择区**（多选）- 卡片式，展示 url
5. **组合预览区** - 实时显示 `人物 × 服装 × 姿势 × 场景` 组合
6. **生成按钮** - 底部固定

## 依赖文件

### 新建
- `app/(app)/tools/jimeng-image/page.tsx` - 页面组件
- `app/api/tools/combination/jimeng-images/route.ts` - 获取可用组合

### 修改
- `app/api/tools/combination/generate/route.ts` - 添加 jimeng-image 类型处理

## 实现顺序

1. 后端 API：`GET /api/tools/combination/jimeng-images`
2. 后端 API：扩展 `POST /api/tools/combination/generate`
3. 前端页面：`jimeng-image/page.tsx`
