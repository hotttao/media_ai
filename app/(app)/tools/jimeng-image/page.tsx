'use client'

import { useState, useEffect } from 'react'
import { CombinationToolPage } from '@/components/video-generation/CombinationToolPage'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, getImageUrl } from '@/foundation/lib/utils'

interface JimengCombination {
  id: string
  ip: { id: string; nickname: string; fullBodyUrl: string | null }
  product: { id: string; name: string; mainImageUrl: string | null }
  modelImageId: string
  modelImageUrl: string
  pose: { id: string; name: string; prompt: string | null; url: string }
  scene: { id: string; name: string; url: string | null }
  existingFirstFrameId: string | null
}

export default function JimengImagePage() {
  const [loading, setLoading] = useState(true)
  const [combinations, setCombinations] = useState<JimengCombination[]>([])
  const [selectedIpId, setSelectedIpId] = useState<string | null>(null)
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set())
  const [selectedPoseIds, setSelectedPoseIds] = useState<Set<string>>(new Set())
  const [selectedSceneIds, setSelectedSceneIds] = useState<Set<string>>(new Set())
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetch('/api/tools/combination/jimeng-images')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch')
        return res.json()
      })
      .then((data: JimengCombination[]) => {
        setCombinations(data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  // 去重获取各维度选项
  const ips = Array.from(
    new Map(combinations.map(c => [c.ip.id, c.ip])).values()
  )

  const products = Array.from(
    new Map(combinations.map(c => [c.product.id, c.product])).values()
  )

  const poses = Array.from(
    new Map(combinations.map(c => [c.pose.id, c.pose])).values()
  )

  const scenes = Array.from(
    new Map(combinations.map(c => [c.scene.id, c.scene])).values()
  )

  // 根据已选人物过滤服装
  const filteredProducts = selectedIpId
    ? products.filter(p =>
        combinations.some(c => c.ip.id === selectedIpId && c.product.id === p.id)
      )
    : products

  // 根据已选人物和服装过滤姿势
  const filteredPoses = selectedIpId && selectedProductIds.size > 0
    ? poses.filter(pose =>
        Array.from(selectedProductIds).some(productId =>
          combinations.some(
            c => c.ip.id === selectedIpId && c.product.id === productId && c.pose.id === pose.id
          )
        )
      )
    : poses

  // 根据已选人物、服装和姿势过滤场景
  const filteredScenes = selectedIpId && selectedProductIds.size > 0 && selectedPoseIds.size > 0
    ? scenes.filter(scene =>
        Array.from(selectedPoseIds).some(poseId =>
          Array.from(selectedProductIds).some(productId =>
            combinations.some(
              c =>
                c.ip.id === selectedIpId &&
                c.product.id === productId &&
                c.pose.id === poseId &&
                c.scene.id === scene.id
            )
          )
        )
      )
    : scenes

  // 计算有效组合
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
            sceneId: sceneId,
            sceneUrl: scenes.find(s => s.id === sceneId)?.url || '',
            existingFirstFrameId: combo.existingFirstFrameId,
          }))
        })
      ).flat()
    : []

  const pendingCount = validCombinations.filter(c => !c.existingFirstFrameId).length

  const handleProductToggle = (productId: string) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }
      return next
    })
  }

  const handlePoseToggle = (poseId: string) => {
    setSelectedPoseIds(prev => {
      const next = new Set(prev)
      if (next.has(poseId)) {
        next.delete(poseId)
      } else {
        next.add(poseId)
      }
      return next
    })
  }

  const handleSceneToggle = (sceneId: string) => {
    setSelectedSceneIds(prev => {
      const next = new Set(prev)
      if (next.has(sceneId)) {
        next.delete(sceneId)
      } else {
        next.add(sceneId)
      }
      return next
    })
  }

  const handleGenerate = async () => {
    if (pendingCount === 0) return

    setGenerating(true)
    const results: { combo: typeof validCombinations[0]; success: boolean }[] = []
    try {
      for (const combo of validCombinations.filter(c => !c.existingFirstFrameId)) {
        const comboData = combinations.find(c => c.id === combo.id)
        if (!comboData) {
          results.push({ combo, success: false })
          continue
        }

        const res = await fetch('/api/tools/combination/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'jimeng-image',
            modelImageId: comboData.modelImageId,
            poseId: comboData.pose.id,
            sceneId: comboData.scene.id,
          }),
        })
        results.push({ combo, success: res.ok })
      }
      const failed = results.filter(r => !r.success)
      if (failed.length > 0) {
        alert(`生成完成，${failed.length} 个失败`)
      } else {
        alert('已提交生成任务')
      }
      window.location.reload()
    } catch (err) {
      console.error(err)
      alert('生成失败')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <CombinationToolPage title="即梦生图" description="选择人物、服装、姿势和场景，生成即梦图" icon="🎨">
        <div className="flex items-center justify-center rounded-xl border border-oat bg-white px-6 py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-matcha-600 border-t-transparent"></div>
          <span className="ml-3 text-sm text-warm-silver">加载中...</span>
        </div>
      </CombinationToolPage>
    )
  }

  return (
    <CombinationToolPage title="即梦生图" description="选择人物、服装、姿势和场景，生成即梦图" icon="🎨">
      <div className="space-y-8">
        {/* 人物选择 - 单选 */}
        <div className="rounded-xl border border-oat bg-white shadow-clay">
          <div className="border-b border-oat px-4 py-3">
            <h3 className="text-sm font-semibold">选择人物</h3>
          </div>
          <div className="p-4">
            {ips.length === 0 ? (
              <p className="text-sm text-warm-silver">暂无可用人物</p>
            ) : (
              <div className="flex gap-3">
                {ips.map(ip => (
                  <button
                    key={ip.id}
                    onClick={() => {
                      setSelectedIpId(ip.id)
                      setSelectedProductIds(new Set())
                      setSelectedPoseIds(new Set())
                      setSelectedSceneIds(new Set())
                    }}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all',
                      selectedIpId === ip.id
                        ? 'border-matcha-600 bg-matcha-50'
                        : 'border-oat hover:border-matcha-600'
                    )}
                  >
                    {ip.fullBodyUrl ? (
                      <img
                        src={getImageUrl(ip.fullBodyUrl)}
                        alt={ip.nickname}
                        className="w-20 aspect-[9/16] rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex w-20 aspect-[9/16] items-center justify-center rounded-lg bg-oat text-sm text-warm-silver">
                        无图片
                      </div>
                    )}
                    <span className="text-sm font-medium">{ip.nickname}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 服装选择 - 多选 */}
        <div className="rounded-xl border border-oat bg-white shadow-clay">
          <div className="flex items-center justify-between border-b border-oat px-4 py-3">
            <h3 className="text-sm font-semibold">选择服装</h3>
            {selectedIpId && (
              <div className="flex gap-2 text-xs text-warm-silver">
                <button
                  onClick={() =>
                    setSelectedProductIds(new Set(filteredProducts.map(p => p.id)))
                  }
                  className="hover:text-foreground"
                >
                  全选
                </button>
                <span>|</span>
                <button
                  onClick={() => setSelectedProductIds(new Set())}
                  className="hover:text-foreground"
                >
                  清空
                </button>
              </div>
            )}
          </div>
          <div className="p-4">
            {!selectedIpId ? (
              <p className="text-sm text-warm-silver">请先选择人物</p>
            ) : filteredProducts.length === 0 ? (
              <p className="text-sm text-warm-silver">暂无可用服装</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {filteredProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => handleProductToggle(product.id)}
                    className={cn(
                      'relative rounded-xl border-2 transition-all',
                      selectedProductIds.has(product.id)
                        ? 'border-matcha-600'
                        : 'border-transparent hover:border-matcha-400'
                    )}
                  >
                    {product.mainImageUrl ? (
                      <img
                        src={getImageUrl(product.mainImageUrl)}
                        alt={product.name}
                        className="h-16 w-16 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-oat text-xs text-warm-silver">
                        无图片
                      </div>
                    )}
                    {selectedProductIds.has(product.id) && (
                      <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-matcha-600 text-white">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="border-t border-oat px-4 py-2">
            <p className="text-xs text-warm-silver">
              已选择 {selectedProductIds.size} / {filteredProducts.length}
            </p>
          </div>
        </div>

        {/* 姿势选择 - 多选 */}
        <div className="rounded-xl border border-oat bg-white shadow-clay">
          <div className="flex items-center justify-between border-b border-oat px-4 py-3">
            <h3 className="text-sm font-semibold">选择姿势</h3>
            {selectedProductIds.size > 0 && (
              <div className="flex gap-2 text-xs text-warm-silver">
                <button
                  onClick={() => setSelectedPoseIds(new Set(filteredPoses.map(p => p.id)))}
                  className="hover:text-foreground"
                >
                  全选
                </button>
                <span>|</span>
                <button
                  onClick={() => setSelectedPoseIds(new Set())}
                  className="hover:text-foreground"
                >
                  清空
                </button>
              </div>
            )}
          </div>
          <div className="p-4">
            {selectedProductIds.size === 0 ? (
              <p className="text-sm text-warm-silver">请先选择服装</p>
            ) : filteredPoses.length === 0 ? (
              <p className="text-sm text-warm-silver">暂无可用姿势</p>
            ) : (
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
            )}
          </div>
          <div className="border-t border-oat px-4 py-2">
            <p className="text-xs text-warm-silver">
              已选择 {selectedPoseIds.size} / {filteredPoses.length}
            </p>
          </div>
        </div>

        {/* 场景选择 - 多选 */}
        <div className="rounded-xl border border-oat bg-white shadow-clay">
          <div className="flex items-center justify-between border-b border-oat px-4 py-3">
            <h3 className="text-sm font-semibold">选择场景</h3>
            {selectedPoseIds.size > 0 && (
              <div className="flex gap-2 text-xs text-warm-silver">
                <button
                  onClick={() => setSelectedSceneIds(new Set(filteredScenes.map(s => s.id)))}
                  className="hover:text-foreground"
                >
                  全选
                </button>
                <span>|</span>
                <button
                  onClick={() => setSelectedSceneIds(new Set())}
                  className="hover:text-foreground"
                >
                  清空
                </button>
              </div>
            )}
          </div>
          <div className="p-4">
            {selectedPoseIds.size === 0 ? (
              <p className="text-sm text-warm-silver">请先选择姿势</p>
            ) : filteredScenes.length === 0 ? (
              <p className="text-sm text-warm-silver">暂无可用场景</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {filteredScenes.map(scene => (
                  <button
                    key={scene.id}
                    onClick={() => handleSceneToggle(scene.id)}
                    className={cn(
                      'relative rounded-xl border-2 p-1 transition-all',
                      selectedSceneIds.has(scene.id)
                        ? 'border-matcha-600'
                        : 'border-transparent hover:border-matcha-400'
                    )}
                  >
                    {scene.url ? (
                      <img
                        src={getImageUrl(scene.url)}
                        alt={scene.name}
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-oat text-xs text-warm-silver">
                        无图片
                      </div>
                    )}
                    <span className="block text-center text-xs mt-1">{scene.name}</span>
                    {selectedSceneIds.has(scene.id) && (
                      <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-matcha-600 text-white">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="border-t border-oat px-4 py-2">
            <p className="text-xs text-warm-silver">
              已选择 {selectedSceneIds.size} / {filteredScenes.length}
            </p>
          </div>
        </div>

        {/* 组合预览 */}
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
                          try {
                            navigator.clipboard.writeText(JSON.stringify({
                              type: 'jimeng-image',
                              modelImageId: combo.modelImageId,
                              poseId: combo.poseId,
                              sceneId: combo.sceneId,
                            }, null, 2))
                            alert('已复制到剪贴板')
                          } catch (err) {
                            alert('复制失败，请手动复制')
                          }
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

        {/* 生成按钮 */}
        <div className="flex items-center justify-end">
          <Button
            onClick={handleGenerate}
            disabled={
              !selectedIpId ||
              selectedProductIds.size === 0 ||
              selectedPoseIds.size === 0 ||
              selectedSceneIds.size === 0 ||
              pendingCount === 0 ||
              generating
            }
            className="bg-matcha-600 hover:bg-matcha-500"
          >
            {generating ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                生成中...
              </>
            ) : (
              <>生成 {pendingCount > 0 && `(${pendingCount})`}</>
            )}
          </Button>
        </div>
      </div>
    </CombinationToolPage>
  )
}