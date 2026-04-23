// domains/video-generation/service.ts
import { db } from '@/foundation/lib/db'
import { v4 as uuid } from 'uuid'
import { providerRegistry } from '@/foundation/providers/registry'
import { ImageBlendTool, SceneReplaceTool, ImageToVideoTool, MotionTransferTool, ModelImageTool, StyleImageTool, MultiImageEditTool } from './tools'
import { createProductMaterial, updateProductMaterial } from '@/domains/product-material/service'
import { getMovementMaterialById } from '@/domains/movement-material/service'
import type { EffectImageGenerationResult, VideoGenerationResult, ModelImageGenerationResult, StyleImageGenerationResult, FirstFrameGenerationResult } from './types'
import type { ToolResult } from '@/foundation/providers/ToolProvider'

const PROVIDER_NAME = 'runninghub' as const

function getRunningHubProvider() {
  const provider = providerRegistry.get(PROVIDER_NAME)
  if (!provider) {
    throw new Error(`Provider ${PROVIDER_NAME} not found`)
  }
  return provider
}

// Simple hash function for deduplication
function hashStrings(...inputs: (string | undefined | null)[]): string {
  const str = inputs.filter(Boolean).join('|')
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

/**
 * 生成模特图 (PRD 4.2 步骤3)
 * 流程: IP 全身图 + 产品主图 + 产品细节图 → 模特图
 * 使用 ModelImage 表 + inputHash 去重
 */
export async function generateModelImage(
  productId: string,
  ipId: string,
  productMainImageUrl: string,
  productDetailImageUrls: string[] = []
): Promise<ModelImageGenerationResult> {
  // 1. 获取 IP 的全身图
  const ip = await db.virtualIp.findUnique({
    where: { id: ipId },
    select: { fullBodyUrl: true },
  })
  if (!ip?.fullBodyUrl) {
    throw new Error(`IP ${ipId} not found or has no fullBodyUrl`)
  }

  // 2. 计算 input hash 用于去重
  const inputHash = hashStrings(productMainImageUrl, ...productDetailImageUrls)

  // 3. 检查是否已存在相同输入的生成结果
  const existing = await db.modelImage.findUnique({
    where: {
      productId_ipId_inputHash: { productId, ipId, inputHash }
    }
  })
  if (existing) {
    return { modelImageUrl: existing.url, modelImageId: existing.id }
  }

  const provider = getRunningHubProvider()

  // 4. 调用模特图生成工具
  const modelInputs: Record<string, string | string[] | null> = {
    ipFullBodyUrl: ip.fullBodyUrl,
    productMainImage: productMainImageUrl,
  }
  if (productDetailImageUrls.length > 0) {
    modelInputs.productDetailImages = productDetailImageUrls
  }
  const modelResult: ToolResult = await provider.execute(ModelImageTool.workflowId, modelInputs)

  if (modelResult.error || !modelResult.outputs.modelImage) {
    throw new Error(`Model image generation failed: ${modelResult.error}`)
  }

  // 5. 保存到 ModelImage 表
  const modelImage = await db.modelImage.create({
    data: {
      id: uuid(),
      productId,
      ipId,
      url: modelResult.outputs.modelImage,
      inputHash,
    }
  })

  return { modelImageUrl: modelImage.url, modelImageId: modelImage.id }
}

/**
 * 生成定妆图 (PRD 4.2 步骤4)
 * 流程: 模特图 + 姿势 + (可选)妆容 + (可选)饰品 → 定妆图
 * 使用 StyleImage 表 + inputHash 去重
 */
export async function generateStyleImage(
  modelImageId: string,
  pose: string,
  makeupUrl?: string,
  accessoryUrl?: string
): Promise<StyleImageGenerationResult> {
  // 1. 获取模特图
  const modelImage = await db.modelImage.findUnique({
    where: { id: modelImageId },
    include: { styleImages: true }
  })
  if (!modelImage) {
    throw new Error(`ModelImage ${modelImageId} not found`)
  }

  // 2. 计算 input hash 用于去重
  const inputHash = hashStrings(pose, makeupUrl, accessoryUrl)

  // 3. 检查是否已存在相同输入的生成结果
  const existing = await db.styleImage.findUnique({
    where: {
      modelImageId_inputHash: { modelImageId, inputHash }
    }
  })
  if (existing) {
    return { styledImageUrl: existing.url, styleImageId: existing.id }
  }

  const provider = getRunningHubProvider()

  // 4. 调用定妆图生成工具
  const styleInputs: Record<string, string | string[] | null> = {
    modelImage: modelImage.url,
    pose,
  }
  if (makeupUrl) styleInputs.makeup = makeupUrl
  if (accessoryUrl) styleInputs.accessory = accessoryUrl

  const styleResult: ToolResult = await provider.execute(StyleImageTool.workflowId, styleInputs)
  if (styleResult.error || !styleResult.outputs.styledImage) {
    throw new Error(`Style image generation failed: ${styleResult.error}`)
  }

  // 5. 保存到 StyleImage 表
  const styleImage = await db.styleImage.create({
    data: {
      id: uuid(),
      productId: modelImage.productId,
      ipId: modelImage.ipId,
      modelImageId,
      url: styleResult.outputs.styledImage,
      poseId: undefined, // pose 是文本描述
      makeupId: undefined,
      accessoryId: undefined,
      inputHash,
    }
  })

  return { styledImageUrl: styleImage.url, styleImageId: styleImage.id }
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
 * 生成首帧图 (新版)
 * 流程: 定妆图 + 场景图 + 构图 → 首帧图
 * 使用 first_frames 表 + inputHash 去重
 */
export async function generateFirstFrame(
  productId: string,
  ipId: string,
  styleImageId: string | null,
  sceneId: string,
  composition: string,
  imageUrl: string
): Promise<FirstFrameGenerationResult> {
  // 1. 计算 input hash 用于去重
  const inputHash = hashStrings(sceneId, composition)

  // 2. 检查是否已存在相同输入的生成结果
  const existing = await db.firstFrame.findUnique({
    where: {
      productId_ipId_sceneId_inputHash: { productId, ipId, sceneId, inputHash }
    }
  })
  if (existing) {
    return { firstFrameUrl: existing.url, firstFrameId: existing.id }
  }

  const provider = getRunningHubProvider()

  // 3. 获取场景图
  const scene = await db.material.findUnique({
    where: { id: sceneId },
    select: { url: true },
  })
  if (!scene?.url) {
    throw new Error(`Scene ${sceneId} not found`)
  }

  // 4. 调用场景替换工具
  const sceneResult: ToolResult = await provider.execute(SceneReplaceTool.workflowId, {
    character: imageUrl,
    scene: scene.url,
  })
  if (sceneResult.error || !sceneResult.outputs.firstFrame) {
    throw new Error(`Scene replace failed: ${sceneResult.error}`)
  }

  // 5. 保存到 first_frames 表
  const firstFrame = await db.firstFrame.create({
    data: {
      id: uuid(),
      productId,
      ipId,
      styleImageId,
      url: sceneResult.outputs.firstFrame,
      sceneId,
      composition,
      inputHash,
    }
  })

  return { firstFrameUrl: firstFrame.url, firstFrameId: firstFrame.id }
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
