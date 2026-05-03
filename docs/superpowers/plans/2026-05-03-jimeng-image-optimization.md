# 即梦生图优化实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 对即梦生图工具进行四项优化：场景关联IP限定、图片比例9:16、姿势显示图片、组合预览增强

**Architecture:** 修改 API 场景查询逻辑获取关联场景；前端修改姿势选择器增加图片显示；修改人物卡片比例为9:16；增强组合预览组件显示模特图+场景图并添加复制参数按钮

**Tech Stack:** Next.js App Router, TypeScript, Prisma, Tailwind

---

## 任务总览

| 任务 | 描述 | 文件 |
|------|------|------|
| 1 | API场景关联过滤 | `app/api/tools/combination/jimeng-images/route.ts` |
| 2 | 姿势选择器显示图片 | `app/(app)/tools/jimeng-image/page.tsx` |
| 3 | 人物卡片9:16比例 | `app/(app)/tools/jimeng-image/page.tsx` |
| 4 | 组合预览增强 | `app/(app)/tools/jimeng-image/page.tsx` |

---

## Task 1: API场景关联过滤

**Files:**
- Modify: `app/api/tools/combination/jimeng-images/route.ts:44-60`

**Changes:**

- [ ] **Step 1: 修改场景查询逻辑**

找到第44-60行的场景查询代码，将其修改为：

```typescript
    // 获取与 IP 或产品关联的场景素材ID
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

    // 获取场景素材（只获取与 IP 或产品关联的）
    const scenes = await db.material.findMany({
      where: {
        type: 'SCENE',
        id: { in: Array.from(allowedSceneMaterialIds) },
        OR: [{ userId }, { visibility: 'PUBLIC' }],
      },
      select: { id: true, name: true, url: true },
    })
```

- [ ] **Step 2: 提交变更**

```bash
git add app/api/tools/combination/jimeng-images/route.ts
git commit -m "fix(jimeng-image): 场景选择关联IP和产品"
```

---

## Task 2: 姿势选择器显示图片

**Files:**
- Modify: `app/(app)/tools/jimeng-image/page.tsx:358-380`

**Changes:**

- [ ] **Step 1: 修改姿势选择器UI**

找到姿势选择区域的代码（第358-380行左右），将：

```tsx
              <div className="flex flex-wrap gap-3">
                {filteredPoses.map(pose => (
                  <button
                    key={pose.id}
                    onClick={() => handlePoseToggle(pose.id)}
                    className={cn(
                      'relative rounded-xl border-2 px-3 py-2 transition-all',
                      selectedPoseIds.has(pose.id)
                        ? 'border-matcha-600 bg-matcha-50'
                        : 'border-oat hover:border-matcha-600'
                    )}
                  >
                    <span className="text-sm font-medium">{pose.name}</span>
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

修改为：

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

- [ ] **Step 2: 提交变更**

```bash
git add app/\(app\)/tools/jimeng-image/page.tsx
git commit -m "feat(jimeng-image): 姿势选择显示图片"
```

---

## Task 3: 人物卡片9:16比例

**Files:**
- Modify: `app/(app)/tools/jimeng-image/page.tsx:239-244`

**Changes:**

- [ ] **Step 1: 修改人物卡片图片样式**

找到人物卡片图片代码（第239-244行左右）：

```tsx
                    {ip.fullBodyUrl ? (
                      <img
                        src={getImageUrl(ip.fullBodyUrl)}
                        alt={ip.nickname}
                        className="h-20 w-20 rounded-lg object-cover"
                      />
                    ) : (
```

修改为：

```tsx
                    {ip.fullBodyUrl ? (
                      <img
                        src={getImageUrl(ip.fullBodyUrl)}
                        alt={ip.nickname}
                        className="w-full aspect-[9/16] rounded-lg object-cover"
                      />
                    ) : (
```

同时需要修改无图片时的占位符高度以匹配比例：

```tsx
                      <div className="flex w-full aspect-[9/16] items-center justify-center rounded-lg bg-oat text-sm text-warm-silver">
                        无图片
                      </div>
```

- [ ] **Step 2: 提交变更**

```bash
git add app/\(app\)/tools/jimeng-image/page.tsx
git commit -m "feat(jimeng-image): 人物卡片图片比例调整为9:16"
```

---

## Task 4: 组合预览增强

**Files:**
- Modify: `app/(app)/tools/jimeng-image/page.tsx:98-119` (validCombinations计算)
- Modify: `app/(app)/tools/jimeng-image/page.tsx:461-496` (组合预览UI)

**Changes:**

- [ ] **Step 1: 扩展validCombinations类型**

找到validCombinations计算部分（约第98-119行），在返回对象中添加 `modelImageUrl`, `poseId`, `sceneUrl` 字段：

```typescript
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
```

- [ ] **Step 2: 修改组合预览UI**

找到组合预览区域（约第461-496行），将整个 `<div className="max-h-60 overflow-y-auto p-4">` 内的内容替换为：

```tsx
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
```

注意：如果 `combo.sceneId` 在当前作用域不可用，需要从 `validCombinations` 的计算中添加 `sceneId` 字段。

- [ ] **Step 3: 确认sceneId可用**

检查validCombinations的计算是否包含sceneId。如果不包含，在添加modelImageUrl、poseId、sceneUrl的地方同时添加sceneId：

```typescript
          return combos.map(combo => ({
            id: combo.id,
            key: `${combo.product.id}|${poseId}|${sceneId}`,
            productName: combo.product.name,
            poseName: poses.find(p => p.id === poseId)?.name || '',
            sceneName: scenes.find(s => s.id === sceneId)?.name || '',
            modelImageId: combo.modelImageId,
            modelImageUrl: combo.modelImageUrl,
            poseId: poseId,
            sceneId: sceneId,
            sceneUrl: scenes.find(s => s.id === sceneId)?.url || '',
            existingFirstFrameId: combo.existingFirstFrameId,
          }))
```

- [ ] **Step 4: 提交变更**

```bash
git add app/\(app\)/tools/jimeng-image/page.tsx
git commit -m "feat(jimeng-image): 组合预览增强-显示图片和复制参数"
```

---

## 验证清单

完成所有任务后，验证以下内容：

- [ ] 场景选择只显示与所选IP和产品关联的场景
- [ ] 姿势选择卡片显示姿势图片（pose.url）
- [ ] 人物卡片图片比例为9:16
- [ ] 组合预览每行显示模特图和场景图缩略图
- [ ] 点击"复制参数"按钮可复制正确的JSON
