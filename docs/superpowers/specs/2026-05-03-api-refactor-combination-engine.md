# API 重构：复用 CombinationEngine

## 概述

重构 `model-images`、`style-images`、`first-frames` 三个 API，内部复用 `CombinationEngine` 计算组合和统计，消除代码重复，提升可维护性和可测试性。

## 背景

现有问题：
- 三个 API 各自实现组合计算逻辑，代码重复
- `CombinationEngine` 已实现但未被复用
- 统计计算（total/generated/pending）在前端实现

目标：
- API 内部使用 Engine 计算
- 保持现有返回格式，前端无感知
- 增加可选参数 `ipId` 支持精确过滤

## 变更1: API 增加可选参数

```
GET /api/tools/combination/model-images?ipId=xxx
GET /api/tools/combination/style-images?productId=xxx&ipId=xxx
GET /api/tools/combination/first-frames?productId=xxx&ipId=xxx
```

- `ipId` 可选，不传时使用默认逻辑（session 中的 IP 或不过滤）
- `productId` 保持现有逻辑

## 变更2: API 内部重构

### model-images/route.ts

```typescript
import { CombinationEngine, ConstraintRegistry, PrismaMaterialPoolProvider } from '@/domains/combination'
import { CombinationType } from '@/domains/combination/types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ipId = searchParams.get('ipId') || undefined
  const productId = searchParams.get('productId') || undefined // 如果需要

  const registry = new ConstraintRegistry()
  const poolProvider = new PrismaMaterialPoolProvider(db)
  const engine = new CombinationEngine(registry, poolProvider)

  // 获取团队所有 ipId（当 ipId 不传时）
  const teamIps = await db.virtualIp.findMany({ where: { teamId }, select: { id: true } })

  // 对每个 ip 计算组合
  const results = []
  for (const ip of teamIps) {
    const result = await engine.compute(ip.id, ip.id, {
      type: CombinationType.MODEL_IMAGE
    })
    // 转换格式适配现有前端
    for (const combo of result.combinations) {
      results.push({
        id: combo.id,
        ip: { id: ip.id, nickname: ip.nickname, fullBodyUrl: ip.fullBodyUrl },
        product: { id: combo.elements.productId, name: '', mainImageUrl: '' },
        existingModelImageId: combo.status !== 'pending' ? combo.existingRecordId : null
      })
    }
  }

  return NextResponse.json(results)
}
```

### style-images/route.ts

类似逻辑，调用 `engine.compute(ipId, productId, { type: CombinationType.STYLE_IMAGE })`

### first-frames/route.ts

类似逻辑，调用 `engine.compute(ipId, productId, { type: CombinationType.FIRST_FRAME })`

## 变更3: Engine 返回格式适配

现有前端期望：
```typescript
{
  id: string
  ip?: { id, nickname, fullBodyUrl }
  product?: { id, name, mainImageUrl }
  pose?: { id, name, url }
  scene?: { id, name, url }
  styleImage?: { id, url }
  modelImage?: { id, url, productName }
  existingModelImageId: string | null
  existingStyleImageId: string | null
  existingFirstFrameId: string | null
}
```

Engine 返回：
```typescript
{
  id: string
  type: CombinationType
  elements: {
    modelImageId?: string
    poseId?: string
    sceneId?: string
    styleImageId?: string
    productId?: string
    ipId?: string
  }
  status: 'pending' | 'generated' | 'qualified' | 'published'
  existingRecordId?: string
}
```

需要转换层将 Engine 结果转为前端期望格式。

## 实现顺序

1. 创建 `domains/combination/adapters/` - 转换层
2. 重构 `model-images/route.ts`
3. 重构 `style-images/route.ts`
4. 重构 `first-frames/route.ts`
5. 测试验证

## 依赖文件

- `domains/combination/engine/CombinationEngine.ts` - 已有
- `domains/combination/engine/MaterialPoolProvider.ts` - 已有
- `app/api/tools/combination/model-images/route.ts` - 修改
- `app/api/tools/combination/style-images/route.ts` - 修改
- `app/api/tools/combination/first-frames/route.ts` - 修改

## 测试计划

- 单元测试：Engine 计算结果与手工计算对比
- API 测试：重构后返回数据与重构前一致