// domains/combination/engine/scene-filter.ts

import { db } from '@/foundation/lib/db'

export interface SceneFilterResult {
  productSceneIds: Set<string>
  ipSceneIds: Set<string>
  productHasSceneConfig: boolean
  ipHasSceneConfig: boolean
}

/**
 * 获取场景过滤配置
 * 此函数封装了场景过滤的核心规则，所有需要过滤场景的地方都应该调用此函数
 */
export async function getSceneFilterConfig(productId: string, ipId: string): Promise<SceneFilterResult> {
  const [productScenes, ipScenes] = await Promise.all([
    db.productScene.findMany({
      where: { productId },
      select: { materialId: true },
    }),
    db.virtualIpScene.findMany({
      where: { virtualIpId: ipId },
      select: { materialId: true },
    }),
  ])

  const productSceneIds = new Set(productScenes.map(ps => ps.materialId))
  const ipSceneIds = new Set(ipScenes.map(ips => ips.materialId))

  return {
    productSceneIds,
    ipSceneIds,
    productHasSceneConfig: productSceneIds.size > 0,
    ipHasSceneConfig: ipSceneIds.size > 0,
  }
}

/**
 * 根据场景过滤配置过滤场景列表
 * 所有需要应用场景过滤的地方都应该使用此函数
 */
export function applySceneFilter<T extends { id: string }>(
  scenes: T[],
  filterConfig: SceneFilterResult
): T[] {
  const { productSceneIds, ipSceneIds, productHasSceneConfig, ipHasSceneConfig } = filterConfig

  return scenes.filter(scene => {
    // 产品过滤：如果产品有场景配置，只显示已关联的
    if (productHasSceneConfig && !productSceneIds.has(scene.id)) {
      return false
    }
    // IP 过滤：如果 IP 有场景配置，只显示已关联的
    if (ipHasSceneConfig && !ipSceneIds.has(scene.id)) {
      return false
    }
    return true
  })
}

/**
 * 过滤场景 - 直接传入场景列表和产品的场景映射、IP 的场景映射
 * 用于不想单独获取 filterConfig 的场景过滤
 */
export function filterScenesByConfig<T extends { id: string }>(
  scenes: T[],
  productSceneIds: Set<string>,
  ipSceneIds: Set<string>
): T[] {
  const productHasSceneConfig = productSceneIds.size > 0
  const ipHasSceneConfig = ipSceneIds.size > 0

  return scenes.filter(scene => {
    if (productHasSceneConfig && !productSceneIds.has(scene.id)) {
      return false
    }
    if (ipHasSceneConfig && !ipSceneIds.has(scene.id)) {
      return false
    }
    return true
  })
}