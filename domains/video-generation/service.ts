// domains/video-generation/service.ts
import { db } from '@/foundation/lib/db'
import { v4 as uuid } from 'uuid'
import { providerRegistry } from '@/foundation/providers/registry'
import { ImageBlendTool, SceneReplaceTool, ImageToVideoTool, MotionTransferTool } from './tools'
import { createProductMaterial, updateProductMaterial } from '@/domains/product-material/service'
import { getMovementMaterialById } from '@/domains/movement-material/service'
import type { EffectImageGenerationResult, VideoGenerationResult } from './types'
import type { ToolResult } from '@/foundation/providers/ToolProvider'

const PROVIDER_NAME = 'runninghub' as const

function getRunningHubProvider() {
  const provider = providerRegistry.get(PROVIDER_NAME)
  if (!provider) {
    throw new Error(`Provider ${PROVIDER_NAME} not found`)
  }
  return provider
}

/**
 * 生成效果图
 * 流程: 人物图 + 服装图 → 效果图1 → 效果图1 + 场景图 → 效果图2 → (有妆容)效果图2 + 妆容 → 最终效果图
 */
export async function generateEffectImage(
  productId: string,
  ipId: string,
  sceneId: string,
  poseId?: string,
  makeupId?: string
): Promise<EffectImageGenerationResult> {
  // 1. 获取 IP 的人物图 (fullBodyUrl)
  const ip = await db.virtualIp.findUnique({
    where: { id: ipId },
    select: { fullBodyUrl: true },
  })
  if (!ip?.fullBodyUrl) {
    throw new Error(`IP ${ipId} not found or has no fullBodyUrl`)
  }
  const fullBodyUrl = ip.fullBodyUrl

  // 2. 获取产品服装图（主图）
  const product = await db.product.findUnique({
    where: { id: productId },
    include: { images: { where: { isMain: true }, take: 1 } },
  })
  if (!product || product.images.length === 0) {
    throw new Error(`Product ${productId} has no main image`)
  }
  const clothingUrl = product.images[0].url

  // 3. 获取场景图
  const scene = await db.material.findUnique({
    where: { id: sceneId },
    select: { url: true },
  })
  if (!scene?.url) {
    throw new Error(`Scene ${sceneId} not found or has no url`)
  }
  const sceneUrl = scene.url

  const provider = getRunningHubProvider()

  // 4. 双图编辑：人物 + 服装 → 效果图1
  const blendResult1: ToolResult = await provider.execute(
    ImageBlendTool.workflowId,
    {
      imageA: fullBodyUrl,
      imageB: clothingUrl,
      prompt: '将服装自然地穿在人物身上，保持人物姿态和面部特征',
    }
  )
  if (blendResult1.error || !blendResult1.outputs.result) {
    throw new Error(`Image blend 1 failed: ${blendResult1.error}`)
  }
  const result1Url = blendResult1.outputs.result

  // 5. 双图编辑：效果图1 + 场景 → 效果图2
  const blendResult2: ToolResult = await provider.execute(
    ImageBlendTool.workflowId,
    {
      imageA: result1Url,
      imageB: sceneUrl,
      prompt: '将人物与场景自然融合，保持光影协调',
    }
  )
  if (blendResult2.error || !blendResult2.outputs.result) {
    throw new Error(`Image blend 2 failed: ${blendResult2.error}`)
  }
  let finalUrl = blendResult2.outputs.result

  // 6. 如果有妆容，双图编辑：效果图2 + 妆容 → 最终效果图
  if (makeupId) {
    const makeup = await db.ipMaterial.findUnique({
      where: { id: makeupId },
      select: { fullBodyUrl: true },
    })
    if (!makeup?.fullBodyUrl) {
      throw new Error(`Makeup ${makeupId} not found or has no fullBodyUrl`)
    }
    const blendResult3: ToolResult = await provider.execute(
      ImageBlendTool.workflowId,
      {
        imageA: finalUrl,
        imageB: makeup.fullBodyUrl,
        prompt: '将妆容自然地应用在人物面部，保持整体效果协调',
      }
    )
    if (blendResult3.error || !blendResult3.outputs.result) {
      throw new Error(`Makeup blend failed: ${blendResult3.error}`)
    }
    finalUrl = blendResult3.outputs.result
  }

  // 7. 保存到 product_materials 表
  const productMaterial = await createProductMaterial({
    productId,
    ipId,
    sceneId,
    poseId,
    fullBodyUrl: finalUrl,
  })

  // 8. 返回 fullBodyUrl 和 productMaterialId
  return {
    fullBodyUrl: finalUrl,
    productMaterialId: productMaterial.id,
  }
}

/**
 * 生成首帧图
 * 流程: 效果图 + 构图场景 → 首帧图
 */
export async function generateFirstFrame(
  productMaterialId: string,
  compositionId: string
): Promise<{ firstFrameUrl: string; productMaterialId: string }> {
  // 1. 获取 product_material 的 fullBodyUrl
  const productMaterial = await db.productMaterial.findUnique({
    where: { id: productMaterialId },
    select: { fullBodyUrl: true },
  })
  if (!productMaterial?.fullBodyUrl) {
    throw new Error(`ProductMaterial ${productMaterialId} not found or has no fullBodyUrl`)
  }
  const effectImageUrl = productMaterial.fullBodyUrl

  // 2. 获取构图场景图
  const composition = await db.material.findUnique({
    where: { id: compositionId },
    select: { url: true },
  })
  if (!composition?.url) {
    throw new Error(`Composition ${compositionId} not found or has no url`)
  }
  const compositionUrl = composition.url

  // 3. 场景替换：效果图 + 构图 → 首帧图
  const provider = getRunningHubProvider()

  const sceneReplaceResult: ToolResult = await provider.execute(
    SceneReplaceTool.workflowId,
    {
      character: effectImageUrl,
      scene: compositionUrl,
    }
  )
  if (sceneReplaceResult.error || !sceneReplaceResult.outputs.firstFrame) {
    throw new Error(`Scene replace failed: ${sceneReplaceResult.error}`)
  }
  const firstFrameUrl = sceneReplaceResult.outputs.firstFrame

  // 4. 更新 product_material 的 firstFrameUrl
  await updateProductMaterial(productMaterialId, { firstFrameUrl })

  // 5. 返回首帧图 URL 和 productMaterialId
  return { firstFrameUrl, productMaterialId }
}

/**
 * 生成视频
 * 流程: 根据动作类型选择 MotionTransferTool 或 ImageToVideoTool
 */
export async function generateVideo(
  productId: string,
  userId: string,
  teamId: string,
  ipId: string,
  firstFrameUrl: string,
  movementId: string,
  productMaterialId?: string
): Promise<VideoGenerationResult> {
  // 1. 获取动作信息 (movement)
  const movement = await getMovementMaterialById(movementId)
  if (!movement) {
    throw new Error(`Movement ${movementId} not found`)
  }

  const provider = getRunningHubProvider()

  let videoUrl: string

  // 2. 如果有 url（视频动作）：使用 MotionTransferTool
  if (movement.url) {
    const motionResult: ToolResult = await provider.execute(
      MotionTransferTool.workflowId,
      {
        image: firstFrameUrl,
        actionVideo: movement.url,
      }
    )
    if (motionResult.error || !motionResult.outputs.video) {
      throw new Error(`Motion transfer failed: ${motionResult.error}`)
    }
    videoUrl = motionResult.outputs.video
  }
  // 3. 否则（文字动作）：使用 ImageToVideoTool
  else {
    const imageToVideoResult: ToolResult = await provider.execute(
      ImageToVideoTool.workflowId,
      {
        image: firstFrameUrl,
        actionText: movement.content,
      }
    )
    if (imageToVideoResult.error || !imageToVideoResult.outputs.video) {
      throw new Error(`Image to video failed: ${imageToVideoResult.error}`)
    }
    videoUrl = imageToVideoResult.outputs.video
  }

  // 4. 使用事务保存视频记录到 videos 表
  const taskId = uuid()
  const video = await db.$transaction(async (tx) => {
    const video = await tx.video.create({
      data: {
        id: uuid(),
        taskId,
        userId,
        teamId,
        ipId,
        productId,
        name: `video_${movementId}_${Date.now()}`,
        url: videoUrl,
      },
    })

    return video
  })

  // 5. 返回 videoId, videoUrl, productMaterialId
  return {
    videoId: video.id,
    videoUrl: video.url,
    productMaterialId: productMaterialId || '',
  }
}
