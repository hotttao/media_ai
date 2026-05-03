---
name: jimeng-image-optimization-design
description: 即梦生图工具优化设计 - 场景关联、图片比例、姿势图片、组合预览增强
status: approved
created: 2026-05-03T06:34:59Z
updated: 2026-05-03T07:45:00Z
---

# 即梦生图工具优化设计

## 概述

对即梦生图工具进行四项优化：场景关联IP限定、图片比例调整、姿势显示图片、组合预览增强。

## 背景：多平台生图支持

### 背景说明

最初只有 GPT 生图工具，所以 `FirstFrame` 表没有 `generationPath` 字段。现在可能有多个生图工具（GPT、即梦等），所以增加了 `generationPath` 字段来区分生成平台。

### 数据追溯链路

**GPT 生图流程**（原始流程）：
```
ModelImage (GPT生成)
  ↓
StyleImage (modelImageId + pose描述 生成 虚假记录)
  ↓
FirstFrame (styleImageId + sceneId + composition 生成)
```

**即梦生图流程**（保持一致）：
虽然即梦是直接通过 `modelImageId, poseId, sceneId` 直接调用的，但数据库记录还是要按照 GPT 的流程创建：
1. 创建一个虚假的 `styleImageId`（hash of modelImageId + pose描述）
2. 创建 `firstFrame` 记录（styleImageId + sceneId + composition + generationPath='JIMENG'）

这样做的好处：
- 保证可以从首帧图反向追溯到模特图和定妆图
- 多平台生成的图可以区分开来（通过 `generationPath`）

### generationPath 字段说明

- **字段位置**：`FirstFrame` 表（已在 `prisma/schema.prisma` 中添加）
- **用途**：标识首帧图的生成平台
- **枚举来源**：`GENERATION_PLATFORMS = ['gpt', 'jimeng']`
- **类型**：`String` (db VarChar(20))
- **默认值**：`'gpt'`
- **唯一键变更**：`[styleImageId, sceneId, composition]` → `[styleImageId, sceneId, composition, generationPath]`

---

## 变更1: 场景选择关联IP

### 问题
场景选择显示所有场景，没有根据虚拟IP进行过滤。用户选择IP后，场景应该只显示与该IP（或该IP所穿产品）关联的场景。

### 解决方案

**API 修改** (`app/api/tools/combination/jimeng-images/route.ts`)：

```typescript
// 获取场景时，改为只获取与 IP 或产品关联的场景
const virtualIpSceneMaterialIds = await db.virtualIpScene.findMany({
  where: { virtualIpId: { in: ips.map(ip => ip.id) } },
  select: { materialId: true },
})

const productSceneMaterialIds = await db.productScene.findMany({
  where: { productId: { in: products.map(p => p.id) } },
  select: { materialId: true },
})

const allowedSceneMaterialIds = new Set([
  ...virtualIpSceneMaterialIds.map(v => v.materialId),
  ...productSceneMaterialIds.map(p => p.materialId),
])

const scenes = await db.material.findMany({
  where: {
    type: 'SCENE',
    id: { in: Array.from(allowedSceneMaterialIds) },
    OR: [{ userId }, { visibility: 'PUBLIC' }],
  },
  select: { id: true, name: true, url: true },
})
```

**前端修改**：
- 场景过滤逻辑保持不变（根据已选的 IP + 产品过滤）
- 但现在场景列表只包含有关联的场景，减少噪音

## 变更2: 图片比例调整为 9:16

### 问题
人物卡片图片比例不正确，需要调整为 9:16（竖版）。

### 解决方案

修改 `app/(app)/tools/jimeng-image/page.tsx` 中的图片样式：

```tsx
// 人物选择卡片 - 9:16 比例
<img
  src={getImageUrl(ip.fullBodyUrl)}
  alt={ip.nickname}
  className="w-full aspect-[9/16] rounded-lg object-cover"
/>
```

服装卡片保持正方形（64x64）。

## 变更3: 姿势选择显示图片

### 问题
姿势选择只有文字，没有图片预览。

### 解决方案

修改姿势选择区的 UI：

```tsx
<div className="flex flex-wrap gap-3">
  {filteredPoses.map(pose => (
    <button
      key={pose.id}
      onClick={() => handlePoseToggle(pose.id)}
      className={cn(
        'relative flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-2 transition-all',
        selectedPoseIds.has(pose.id)
          ? 'border-matcha-600 bg-matcha-50'
          : 'border-oat hover:border-matcha-600'
      )}
    >
      {/* 姿势图片 */}
      {pose.url ? (
        <img
          src={getImageUrl(pose.url)}
          alt={pose.name}
          className="h-16 w-16 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-oat text-xs text-warm-silver">
          无图片
        </div>
      )}
      <span className="text-sm font-medium">{pose.name}</span>
      {/* 选中标记 */}
      {selectedPoseIds.has(pose.id) && (
        <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-matcha-600 text-white">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  ))}
</div>
```

## 变更4: 组合预览增强

### 问题
- 组合预览只显示文字，没有图片
- 没有复制参数功能

### 解决方案

增强组合预览组件：

```tsx
{validCombinations.length > 0 && (
  <div className="rounded-xl border border-oat bg-white shadow-clay">
    <div className="flex items-center justify-between border-b border-oat px-4 py-3">
      <h3 className="text-sm font-semibold">生成的组合</h3>
      <span className="text-xs text-warm-silver">
        待生成 <span className="font-medium text-foreground">{pendingCount}</span>
      </span>
    </div>
    <div className="max-h-60 overflow-y-auto p-4">
      <div className="space-y-2">
        {validCombinations.map(combo => (
          <div
            key={combo.id}
            className={cn(
              'flex items-center justify-between rounded-lg border px-3 py-2',
              !combo.existingFirstFrameId && 'border-oat bg-white',
              combo.existingFirstFrameId && 'border-matcha-600/30 bg-matcha-50'
            )}
          >
            <div className="flex items-center gap-3">
              {/* 模特图缩略图 */}
              <img
                src={getImageUrl(combo.modelImageUrl)}
                alt={combo.productName}
                className="h-10 w-10 rounded-lg object-cover"
              />
              <span className="text-warm-silver">×</span>
              {/* 场景图缩略图 */}
              <img
                src={getImageUrl(combo.sceneUrl)}
                alt={combo.sceneName}
                className="h-10 w-10 rounded-lg object-cover"
              />
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{combo.productName}</span>
                <span className="text-warm-silver">×</span>
                <span>{combo.poseName}</span>
                <span className="text-warm-silver">×</span>
                <span>{combo.sceneName}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {combo.existingFirstFrameId && (
                <Badge variant="success" className="text-xs">已存在</Badge>
              )}
              {/* 复制参数按钮 */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify({
                    type: 'jimeng-image',
                    modelImageId: combo.modelImageId,
                    poseId: combo.poseId,
                    sceneId: combo.sceneId,
                  }, null, 2))
                  // 可选：显示 toast 或 alert
                }}
                className="rounded-lg border border-oat px-2 py-1 text-xs text-warm-silver hover:border-matcha-600 hover:text-foreground"
              >
                复制参数
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)}
```

需要更新 `validCombinations` 类型以包含额外字段：

```typescript
const validCombinations = selectedIpId && selectedProductIds.size > 0 && selectedPoseIds.size > 0 && selectedSceneIds.size > 0
  ? Array.from(selectedPoseIds).flatMap(poseId =>
      Array.from(selectedSceneIds).map(sceneId => {
        const combos = combinations.filter(
          c =>
            c.ip.id === selectedIpId &&
            selectedProductIds.has(c.product.id) &&
            c.pose.id === poseId &&
            c.scene.id === sceneId
        )
        return combos.map(combo => ({
          id: combo.id,
          key: `${combo.product.id}|${poseId}|${sceneId}`,
          productName: combo.product.name,
          poseName: poses.find(p => p.id === poseId)?.name || '',
          sceneName: scenes.find(s => s.id === sceneId)?.name || '',
          modelImageId: combo.modelImageId,
          modelImageUrl: combo.modelImageUrl,
          poseId: poseId,
          sceneUrl: scenes.find(s => s.id === sceneId)?.url || '',
          existingFirstFrameId: combo.existingFirstFrameId,
        }))
      })
    ).flat()
  : []
```

## 实现顺序

1. **API 修改**：场景关联过滤
2. **前端姿势图片**：姿势选择器显示图片
3. **前端人物卡片**：9:16 比例
4. **前端组合预览**：增强显示 + 复制功能

## 依赖文件

- `app/api/tools/combination/jimeng-images/route.ts` - 修改场景查询
- `app/(app)/tools/jimeng-image/page.tsx` - 修改姿势、人物、组合预览
