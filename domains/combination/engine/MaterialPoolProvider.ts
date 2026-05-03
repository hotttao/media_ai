// domains/combination/engine/MaterialPoolProvider.ts

import { db } from '@/foundation/lib/db'
import { MaterialPool, Combination, CombinationType, Pose, Movement, Scene } from '../types'

export interface MaterialPoolProvider {
  getPool(productId: string, ipId: string): Promise<MaterialPool>
  getExistingCombinations(productId: string, ipId: string, type: CombinationType): Promise<Combination[]>
}

export class PrismaMaterialPoolProvider implements MaterialPoolProvider {
  async getPool(productId: string, ipId: string): Promise<MaterialPool> {
    const [poses, movements, scenes, styleImages, modelImages] = await Promise.all([
      // Poses - 从 material 表获取 type='POSE' 的记录
      db.material.findMany({
        where: { type: 'POSE' },
        select: { id: true, name: true, url: true, prompt: true }
      }),
      // Movements - 从 movement_materials 表获取，包含 poseLinks
      db.movementMaterial.findMany({
        include: {
          poseLinks: { select: { poseId: true } }
        }
      }),
      // Scenes - 从 material 表获取 type='SCENE'
      db.material.findMany({
        where: { type: 'SCENE' },
        select: { id: true, name: true, url: true }
      }),
      // Style Images
      db.styleImage.findMany({
        where: { productId, ipId },
        select: { id: true, productId: true, ipId: true, url: true, prompt: true, poseId: true, makeupId: true, accessoryId: true }
      }),
      // Model Images
      db.modelImage.findMany({
        where: { productId, ipId },
        select: { id: true, productId: true, ipId: true, url: true, prompt: true }
      })
    ])

    return {
      poses: poses.map(p => ({
        id: p.id,
        name: p.name,
        url: p.url,
        prompt: p.prompt,
        ipId: ipId
      })) as Pose[],
      movements: movements.map(m => ({
        id: m.id,
        ipId: ipId,
        name: m.content,
        url: m.url || undefined,
        content: m.content,
        isGeneral: m.isGeneral,
        poseIds: m.poseLinks.map(link => link.poseId)
      })) as Movement[],
      scenes: scenes as unknown as Scene[],
      styleImages: styleImages as any[],
      modelImages: modelImages as any[]
    }
  }

  async getExistingCombinations(
    productId: string,
    ipId: string,
    type: CombinationType
  ): Promise<Combination[]> {
    switch (type) {
      case CombinationType.MODEL_IMAGE:
        return this.getExistingModelImages(productId, ipId)
      case CombinationType.STYLE_IMAGE:
        return this.getExistingStyleImages(productId, ipId)
      case CombinationType.FIRST_FRAME:
        return this.getExistingFirstFrames(productId, ipId)
      case CombinationType.VIDEO:
        return this.getExistingVideos(productId, ipId)
    }
  }

  private async getExistingModelImages(productId: string, ipId: string): Promise<Combination[]> {
    const records = await db.modelImage.findMany({
      where: { productId, ipId },
      select: { id: true, productId: true, ipId: true }
    })

    return records.map(r => ({
      id: r.id,
      type: CombinationType.MODEL_IMAGE,
      elements: { modelImageId: r.id, productId: r.productId, ipId: r.ipId },
      status: 'generated' as const,
      existingRecordId: r.id
    }))
  }

  private async getExistingStyleImages(productId: string, ipId: string): Promise<Combination[]> {
    const records = await db.styleImage.findMany({
      where: { productId, ipId },
      select: { id: true, modelImageId: true, poseId: true, makeupId: true, accessoryId: true }
    })

    return records.map(r => ({
      id: r.id,
      type: CombinationType.STYLE_IMAGE,
      elements: {
        modelImageId: r.modelImageId,
        poseId: r.poseId,
        makeupId: r.makeupId,
        accessoryId: r.accessoryId,
        styleImageId: r.id
      },
      status: 'generated' as const,
      existingRecordId: r.id
    }))
  }

  private async getExistingFirstFrames(productId: string, ipId: string): Promise<Combination[]> {
    const records = await db.firstFrame.findMany({
      where: { productId, ipId },
      select: { id: true, styleImageId: true, sceneId: true }
    })

    return records.map(r => ({
      id: r.id,
      type: CombinationType.FIRST_FRAME,
      elements: {
        styleImageId: r.styleImageId,
        sceneId: r.sceneId,
        firstFrameId: r.id
      },
      status: 'generated' as const,
      existingRecordId: r.id
    }))
  }

  private async getExistingVideos(productId: string, ipId: string): Promise<Combination[]> {
    const videos = await db.video.findMany({
      where: { productId, ipId },
      include: {
        videoPush: { select: { isQualified: true, isPublished: true } }
      }
    })

    return videos.map(v => ({
      id: v.id,
      type: CombinationType.VIDEO,
      elements: {
        firstFrameId: v.firstFrameId || undefined,
        movementId: v.movementId || undefined,
        videoId: v.id
      },
      status: v.videoPush?.isPublished ? 'published' as const
        : v.videoPush?.isQualified ? 'qualified' as const
        : 'generated' as const,
      existingRecordId: v.id
    }))
  }
}