'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getImageUrl } from '@/foundation/lib/utils'

// ============ Types ============

type Step = 'model-image' | 'style-image' | 'first-frame'

interface IpOption {
  id: string
  nickname: string
  fullBodyUrl?: string
}

interface ProductOption {
  id: string
  name: string
  mainImageUrl?: string
}

interface ModelImageCombination {
  id: string
  ip: IpOption
  product: ProductOption
  existingModelImageId: string | null
}

interface StyleImageCombination {
  id: string
  pose: { id: string; name: string; url: string | null }
  modelImage: { id: string; url: string; productName?: string | null }
  existingStyleImageId: string | null
}

interface FirstFrameCombination {
  id: string
  scene: { id: string; name: string; url: string | null }
  styleImage: { id: string; url: string }
  productId: string
  ipId: string
  existingFirstFrameId: string | null
  existingFirstFrameIdGpt?: string | null
  existingFirstFrameIdJimeng?: string | null
}

type GenerationPlatform = 'gpt' | 'jimeng'

// ============ Step Indicator ============

const STEPS = [
  { id: 'model-image' as Step, label: '模特图', icon: '👗' },
  { id: 'style-image' as Step, label: '定妆图', icon: '💄' },
  { id: 'first-frame' as Step, label: '首帧图', icon: '🖼️' },
]

function StepIndicator({ current, onStepClick, completedSteps }: {
  current: Step
  onStepClick: (step: Step) => void
  completedSteps: Set<Step>
}) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((step, index) => {
        const isActive = step.id === current
        const isCompleted = completedSteps.has(step.id)
        // 暂时允许自由切换步骤以便测试
        const isClickable = true

        return (
          <div key={step.id} className="flex items-center">
            {index > 0 && (
              <div className={`w-8 h-0.5 mx-2 ${isCompleted ? 'bg-matcha-600' : 'bg-oat'}`} />
            )}
            <button
              onClick={() => onStepClick(step.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full transition-all cursor-pointer
                ${isActive
                  ? 'bg-matcha-600 text-white'
                  : 'bg-matcha-100 text-matcha-600 hover:bg-matcha-200'
                }
              `}
            >
              <span>{step.icon}</span>
              <span className="text-sm font-medium">{step.label}</span>
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ============ Step 1: Model Image ============

function Step1ModelImage({
  productId,
  onComplete
}: {
  productId: string
  onComplete: () => void
}) {
  const [combinations, setCombinations] = useState<ModelImageCombination[]>([])
  const [selectedIpId, setSelectedIpId] = useState<string | null>(null)
  const [selectedCombinations, setSelectedCombinations] = useState<Set<string>>(new Set())
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/tools/combination/model-images')
      .then(res => res.json())
      .then((data: ModelImageCombination[]) => {
        const filtered = data.filter(c => c.product.id === productId)
        setCombinations(filtered)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [productId])

  useEffect(() => {
    if (!selectedIpId && combinations.length > 0) {
      setSelectedIpId(combinations[0].ip.id)
    }
  }, [selectedIpId, combinations])

  const ips = useMemo(() => {
    const ipMap = new Map<string, IpOption>()
    for (const c of combinations) {
      if (!ipMap.has(c.ip.id)) ipMap.set(c.ip.id, c.ip)
    }
    return Array.from(ipMap.values())
  }, [combinations])

  const combinationsForIp = useMemo(() => {
    if (!selectedIpId) return []
    return combinations.filter(c => c.ip.id === selectedIpId)
  }, [combinations, selectedIpId])

  const stats = useMemo(() => ({
    total: combinationsForIp.length,
    generated: combinationsForIp.filter(c => c.existingModelImageId).length,
    pending: combinationsForIp.filter(c => !c.existingModelImageId).length,
  }), [combinationsForIp])

  const handleToggle = (id: string) => {
    setSelectedCombinations(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleGenerate = async () => {
    if (selectedCombinations.size === 0) return
    setGenerating(true)
    try {
      const combos = combinationsForIp.filter(c => selectedCombinations.has(c.id))
      for (const combo of combos) {
        await fetch('/api/tools/combination/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'model-image', ipId: combo.ip.id, productId: combo.product.id }),
        })
      }
      alert('已提交生成任务')
      onComplete()
    } catch {
      alert('生成失败')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return <div className="text-center py-12">加载中...</div>

  return (
    <div>
      {/* IP Selection */}
      <div className="rounded-xl border border-oat bg-white shadow-clay mb-6">
        <div className="border-b border-oat px-4 py-3">
          <h3 className="text-sm font-semibold">选择虚拟IP</h3>
        </div>
        <div className="p-4">
          {ips.length === 0 ? (
            <p className="text-sm text-warm-silver">暂无可用IP</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {ips.map(ip => (
                <button
                  key={ip.id}
                  onClick={() => { setSelectedIpId(ip.id); setSelectedCombinations(new Set()) }}
                  className={`
                    flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all flex-shrink-0
                    ${selectedIpId === ip.id ? 'border-matcha-600 bg-matcha-50' : 'border-oat hover:border-matcha-600'}
                  `}
                >
                  {ip.fullBodyUrl ? (
                    <img src={getImageUrl(ip.fullBodyUrl)} alt={ip.nickname} className="h-20 w-20 rounded-lg object-cover" />
                  ) : (
                    <div className="h-20 w-20 rounded-lg bg-oat flex items-center justify-center text-sm text-warm-silver">无图片</div>
                  )}
                  <span className="text-sm font-medium">{ip.nickname}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Combinations */}
      <div className="rounded-xl border border-oat bg-white shadow-clay">
        <div className="flex items-center justify-between border-b border-oat px-4 py-3">
          <h3 className="text-sm font-semibold">IP × 产品 组合</h3>
          <div className="flex items-center gap-4 text-xs text-warm-silver">
            <span>已生成 <span className="font-medium text-matcha-600">{stats.generated}</span></span>
            <span>待生成 <span className="font-medium text-amber-600">{stats.pending}</span></span>
          </div>
        </div>
        <div className="p-4">
          <div className="space-y-2">
            {combinationsForIp.map(combo => {
              const isGenerated = !!combo.existingModelImageId
              const isSelected = selectedCombinations.has(combo.id)
              return (
                <div key={combo.id} className={`
                  flex items-center justify-between rounded-lg border px-4 py-3
                  ${isGenerated ? 'border-matcha-600/30 bg-matcha-50/50' : 'border-oat bg-white hover:border-matcha-600'}
                  ${isSelected && !isGenerated ? 'ring-2 ring-matcha-600 ring-offset-1' : ''}
                `}>
                  <div className="flex items-center gap-3">
                    {!isGenerated && (
                      <button
                        onClick={() => handleToggle(combo.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-matcha-600 border-matcha-600' : 'border-gray-300'}`}
                      >
                        {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </button>
                    )}
                    {isGenerated && <div className="w-5" />}
                    <img src={getImageUrl(combo.ip.fullBodyUrl)} alt={combo.ip.nickname} className="h-10 w-10 rounded-lg object-cover" />
                    <span className="text-sm font-medium">{combo.ip.nickname}</span>
                    <span className="text-warm-silver">×</span>
                    <img src={getImageUrl(combo.product.mainImageUrl)} alt={combo.product.name} className="h-10 w-10 rounded-lg object-cover" />
                    <span className="text-sm text-warm-silver">{combo.product.name}</span>
                  </div>
                  <Badge variant={isGenerated ? 'success' : 'warning'} className="text-xs">
                    {isGenerated ? '已生成' : '待生成'}
                  </Badge>
                </div>
              )
            })}
          </div>
        </div>
        {stats.pending > 0 && (
          <div className="flex items-center justify-between border-t border-oat px-4 py-3">
            <div className="flex gap-2 text-xs text-warm-silver">
              <button onClick={() => setSelectedCombinations(new Set(combinationsForIp.filter(c => !c.existingModelImageId).map(c => c.id)))}>全选待生成</button>
              <span>|</span>
              <button onClick={() => setSelectedCombinations(new Set())}>清空选择</button>
            </div>
            <Button onClick={handleGenerate} disabled={selectedCombinations.size === 0 || generating} className="bg-matcha-600 hover:bg-matcha-500">
              {generating ? '生成中...' : `生成 ${selectedCombinations.size > 0 ? `(${selectedCombinations.size})` : ''}`}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ============ Step 2: Style Image ============

function Step2StyleImage({ productId }: { productId: string }) {
  const [combinations, setCombinations] = useState<StyleImageCombination[]>([])
  const [selectedPoseIds, setSelectedPoseIds] = useState<Set<string>>(new Set())
  const [selectedModelImageIds, setSelectedModelImageIds] = useState<Set<string>>(new Set())
  const [selectedCombinations, setSelectedCombinations] = useState<Set<string>>(new Set())
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/tools/combination/style-images?productId=${productId}`)
      .then(res => res.json())
      .then((data: StyleImageCombination[]) => {
        setCombinations(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [productId])

  const availablePoses = useMemo(() => {
    const poseMap = new Map<string, StyleImageCombination['pose']>()
    for (const c of combinations) {
      if (!poseMap.has(c.pose.id)) poseMap.set(c.pose.id, c.pose)
    }
    return Array.from(poseMap.values())
  }, [combinations])

  const availableModelImages = useMemo(() => {
    const miMap = new Map<string, StyleImageCombination['modelImage']>()
    for (const c of combinations) {
      if (!miMap.has(c.modelImage.id)) miMap.set(c.modelImage.id, c.modelImage)
    }
    return Array.from(miMap.values())
  }, [combinations])

  const filteredCombinations = useMemo(() => {
    return combinations.filter(c => {
      const poseMatch = selectedPoseIds.size === 0 || selectedPoseIds.has(c.pose.id)
      const miMatch = selectedModelImageIds.size === 0 || selectedModelImageIds.has(c.modelImage.id)
      return poseMatch && miMatch
    })
  }, [combinations, selectedPoseIds, selectedModelImageIds])

  const stats = useMemo(() => ({
    total: filteredCombinations.length,
    generated: filteredCombinations.filter(c => c.existingStyleImageId).length,
    pending: filteredCombinations.filter(c => !c.existingStyleImageId).length,
  }), [filteredCombinations])

  const handleToggle = (id: string) => {
    setSelectedCombinations(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleGenerate = async () => {
    if (selectedCombinations.size === 0) return
    setGenerating(true)
    try {
      for (const combo of filteredCombinations.filter(c => selectedCombinations.has(c.id))) {
        await fetch('/api/tools/combination/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'style-image', modelImageId: combo.modelImage.id, poseId: combo.pose.id }),
        })
      }
      alert('已提交生成任务')
    } catch {
      alert('生成失败')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return <div className="text-center py-12">加载中...</div>

  return (
    <div>
      {/* Pose Filter */}
      <div className="rounded-xl border border-oat bg-white shadow-clay mb-6">
        <div className="border-b border-oat px-4 py-3">
          <h3 className="text-sm font-semibold">选择姿势</h3>
        </div>
        <div className="p-4">
          <div className="flex flex-wrap gap-2">
            {availablePoses.map(pose => (
              <button
                key={pose.id}
                onClick={() => {
                  setSelectedPoseIds(prev => {
                    const next = new Set(prev)
                    next.has(pose.id) ? next.delete(pose.id) : next.add(pose.id)
                    return next
                  })
                }}
                className={`
                  flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-sm transition-all
                  ${selectedPoseIds.has(pose.id) ? 'border-matcha-600 bg-matcha-600 text-white' : 'border-oat hover:border-matcha-600'}
                `}
              >
                {pose.url && <img src={getImageUrl(pose.url)} alt={pose.name} className="h-5 w-5 rounded object-cover" />}
                <span>{pose.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Model Image Filter */}
      <div className="rounded-xl border border-oat bg-white shadow-clay mb-6">
        <div className="border-b border-oat px-4 py-3">
          <h3 className="text-sm font-semibold">选择模特图</h3>
        </div>
        <div className="p-4">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {availableModelImages.map(mi => (
              <button
                key={mi.id}
                onClick={() => {
                  setSelectedModelImageIds(prev => {
                    const next = new Set(prev)
                    next.has(mi.id) ? next.delete(mi.id) : next.add(mi.id)
                    return next
                  })
                }}
                className={`
                  flex flex-col items-center gap-2 rounded-xl border-2 p-2 transition-all flex-shrink-0
                  ${selectedModelImageIds.has(mi.id) ? 'border-matcha-600 bg-matcha-50' : 'border-oat hover:border-matcha-600'}
                `}
              >
                <img src={getImageUrl(mi.url)} alt={mi.productName} className="h-16 w-16 rounded-lg object-cover" />
                <span className="text-xs text-warm-silver">{mi.productName}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Combinations */}
      <div className="rounded-xl border border-oat bg-white shadow-clay">
        <div className="flex items-center justify-between border-b border-oat px-4 py-3">
          <h3 className="text-sm font-semibold">姿势 × 模特图 组合</h3>
          <div className="flex items-center gap-4 text-xs text-warm-silver">
            <span>已生成 <span className="font-medium text-matcha-600">{stats.generated}</span></span>
            <span>待生成 <span className="font-medium text-amber-600">{stats.pending}</span></span>
          </div>
        </div>
        <div className="p-4">
          <div className="space-y-2">
            {filteredCombinations.map(combo => {
              const isGenerated = !!combo.existingStyleImageId
              const isSelected = selectedCombinations.has(combo.id)
              return (
                <div key={combo.id} className={`
                  flex items-center justify-between rounded-lg border px-4 py-3
                  ${isGenerated ? 'border-matcha-600/30 bg-matcha-50/50' : 'border-oat bg-white hover:border-matcha-600'}
                  ${isSelected && !isGenerated ? 'ring-2 ring-matcha-600 ring-offset-1' : ''}
                `}>
                  <div className="flex items-center gap-3">
                    {!isGenerated && (
                      <button
                        onClick={() => handleToggle(combo.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-matcha-600 border-matcha-600' : 'border-gray-300'}`}
                      >
                        {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </button>
                    )}
                    {isGenerated && <div className="w-5" />}
                    {combo.pose.url && <img src={getImageUrl(combo.pose.url)} alt={combo.pose.name} className="h-10 w-10 rounded-lg object-cover" />}
                    <span className="text-sm">{combo.pose.name}</span>
                    <span className="text-warm-silver">×</span>
                    <img src={getImageUrl(combo.modelImage.url)} alt={combo.modelImage.productName} className="h-10 w-10 rounded-lg object-cover" />
                    <span className="text-sm text-warm-silver">{combo.modelImage.productName}</span>
                  </div>
                  <Badge variant={isGenerated ? 'success' : 'warning'} className="text-xs">
                    {isGenerated ? '已生成' : '待生成'}
                  </Badge>
                </div>
              )
            })}
          </div>
        </div>
        {stats.pending > 0 && (
          <div className="flex items-center justify-between border-t border-oat px-4 py-3">
            <div className="flex gap-2 text-xs text-warm-silver">
              <button onClick={() => setSelectedCombinations(new Set(filteredCombinations.filter(c => !c.existingStyleImageId).map(c => c.id)))}>全选待生成</button>
              <span>|</span>
              <button onClick={() => setSelectedCombinations(new Set())}>清空选择</button>
            </div>
            <Button onClick={handleGenerate} disabled={selectedCombinations.size === 0 || generating} className="bg-matcha-600 hover:bg-matcha-500">
              {generating ? '生成中...' : `生成 ${selectedCombinations.size > 0 ? `(${selectedCombinations.size})` : ''}`}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ============ Step 3: First Frame ============

function Step3FirstFrame({ productId }: { productId: string }) {
  const [combinations, setCombinations] = useState<FirstFrameCombination[]>([])
  const [selectedSceneIds, setSelectedSceneIds] = useState<Set<string>>(new Set())
  const [selectedStyleImageIds, setSelectedStyleImageIds] = useState<Set<string>>(new Set())
  const [selectedPlatform, setSelectedPlatform] = useState<GenerationPlatform>('gpt')
  const [selectedCombinations, setSelectedCombinations] = useState<Set<string>>(new Set())
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/tools/combination/first-frames?productId=${productId}`)
      .then(res => res.json())
      .then((data: FirstFrameCombination[]) => {
        setCombinations(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [productId])

  const availableStyleImages = useMemo(() => {
    const styleImageMap = new Map<string, FirstFrameCombination['styleImage']>()
    for (const c of combinations) {
      if (!styleImageMap.has(c.styleImage.id)) styleImageMap.set(c.styleImage.id, c.styleImage)
    }
    return Array.from(styleImageMap.values())
  }, [combinations])

  const availableScenes = useMemo(() => {
    const sceneMap = new Map<string, FirstFrameCombination['scene']>()
    for (const c of combinations) {
      if (!sceneMap.has(c.scene.id)) sceneMap.set(c.scene.id, c.scene)
    }
    return Array.from(sceneMap.values())
  }, [combinations])

  const filteredCombinations = useMemo(() => {
    return combinations.filter(c => {
      const sceneMatch = selectedSceneIds.size === 0 || selectedSceneIds.has(c.scene.id)
      const styleImageMatch = selectedStyleImageIds.size === 0 || selectedStyleImageIds.has(c.styleImage.id)
      return sceneMatch && styleImageMatch
    })
  }, [combinations, selectedSceneIds, selectedStyleImageIds])

  const existingIdKey = selectedPlatform === 'gpt' ? 'existingFirstFrameIdGpt' : 'existingFirstFrameIdJimeng'

  const stats = useMemo(() => ({
    total: filteredCombinations.length,
    generated: filteredCombinations.filter(c => c[existingIdKey]).length,
    pending: filteredCombinations.filter(c => !c[existingIdKey]).length,
  }), [filteredCombinations, existingIdKey])

  const handleToggle = (id: string) => {
    setSelectedCombinations(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleGenerate = async () => {
    if (selectedCombinations.size === 0) return
    setGenerating(true)
    try {
      for (const combo of filteredCombinations.filter(c => selectedCombinations.has(c.id))) {
        await fetch('/api/tools/combination/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'first-frame', styleImageId: combo.styleImage.id, sceneId: combo.scene.id, generationPath: selectedPlatform }),
        })
      }
      alert('已提交生成任务')
    } catch {
      alert('生成失败')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return <div className="text-center py-12">加载中...</div>

  return (
    <div>
      {/* Platform Selector */}
      <div className="rounded-xl border border-oat bg-white shadow-clay mb-6">
        <div className="border-b border-oat px-4 py-3">
          <h3 className="text-sm font-semibold">选择生成平台</h3>
        </div>
        <div className="p-4">
          <div className="flex gap-3">
            <button
              onClick={() => {
                setSelectedPlatform('gpt')
                setSelectedCombinations(new Set())
              }}
              className={`
                flex items-center gap-2 rounded-xl border-2 px-4 py-2 transition-all
                ${selectedPlatform === 'gpt' ? 'border-matcha-600 bg-matcha-50' : 'border-oat hover:border-matcha-600'}
              `}
            >
              <span className="text-lg">🖼️</span>
              <span className="font-medium">GPT 生图</span>
            </button>
            <button
              onClick={() => {
                setSelectedPlatform('jimeng')
                setSelectedCombinations(new Set())
              }}
              className={`
                flex items-center gap-2 rounded-xl border-2 px-4 py-2 transition-all
                ${selectedPlatform === 'jimeng' ? 'border-matcha-600 bg-matcha-50' : 'border-oat hover:border-matcha-600'}
              `}
            >
              <span className="text-lg">🎨</span>
              <span className="font-medium">即梦生图</span>
            </button>
          </div>
        </div>
      </div>

      {/* StyleImage Filter */}
      <div className="rounded-xl border border-oat bg-white shadow-clay mb-6">
        <div className="flex items-center justify-between border-b border-oat px-4 py-3">
          <h3 className="text-sm font-semibold">选择定妆图</h3>
          {availableStyleImages.length > 0 && (
            <div className="flex gap-2 text-xs text-warm-silver">
              <button onClick={() => setSelectedStyleImageIds(new Set(availableStyleImages.map(s => s.id)))}>全选</button>
              <span>|</span>
              <button onClick={() => setSelectedStyleImageIds(new Set())}>清空</button>
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {availableStyleImages.map(styleImage => (
              <button
                key={styleImage.id}
                onClick={() => {
                  setSelectedStyleImageIds(prev => {
                    const next = new Set(prev)
                    next.has(styleImage.id) ? next.delete(styleImage.id) : next.add(styleImage.id)
                    return next
                  })
                }}
                className={`
                  flex flex-col items-center gap-2 rounded-xl border-2 p-2 transition-all flex-shrink-0
                  ${selectedStyleImageIds.has(styleImage.id) ? 'border-matcha-600 bg-matcha-50' : 'border-oat hover:border-matcha-600'}
                `}
              >
                <img src={getImageUrl(styleImage.url)} alt="定妆图" className="h-16 w-16 rounded-lg object-cover" />
              </button>
            ))}
          </div>
        </div>
        <div className="border-t border-oat px-4 py-2">
          <p className="text-xs text-warm-silver">
            已选择 {selectedStyleImageIds.size} / {availableStyleImages.length}
          </p>
        </div>
      </div>

      {/* Scene Filter */}
      <div className="rounded-xl border border-oat bg-white shadow-clay mb-6">
        <div className="border-b border-oat px-4 py-3">
          <h3 className="text-sm font-semibold">选择场景</h3>
        </div>
        <div className="p-4">
          <div className="flex flex-wrap gap-2">
            {availableScenes.map(scene => (
              <button
                key={scene.id}
                onClick={() => {
                  setSelectedSceneIds(prev => {
                    const next = new Set(prev)
                    next.has(scene.id) ? next.delete(scene.id) : next.add(scene.id)
                    return next
                  })
                }}
                className={`
                  flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-sm transition-all
                  ${selectedSceneIds.has(scene.id) ? 'border-matcha-600 bg-matcha-600 text-white' : 'border-oat hover:border-matcha-600'}
                `}
              >
                {scene.url && <img src={getImageUrl(scene.url)} alt={scene.name} className="h-5 w-5 rounded object-cover" />}
                <span>{scene.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Combinations */}
      <div className="rounded-xl border border-oat bg-white shadow-clay">
        <div className="flex items-center justify-between border-b border-oat px-4 py-3">
          <h3 className="text-sm font-semibold">场景 × 定妆图 组合</h3>
          <div className="flex items-center gap-4 text-xs text-warm-silver">
            <span>已生成 <span className="font-medium text-matcha-600">{stats.generated}</span></span>
            <span>待生成 <span className="font-medium text-amber-600">{stats.pending}</span></span>
          </div>
        </div>
        <div className="p-4">
          <div className="space-y-2">
            {filteredCombinations.map(combo => {
              const isGenerated = !!combo[existingIdKey]
              const isSelected = selectedCombinations.has(combo.id)
              return (
                <div key={combo.id} className={`
                  flex items-center justify-between rounded-lg border px-4 py-3
                  ${isGenerated ? 'border-matcha-600/30 bg-matcha-50/50' : 'border-oat bg-white hover:border-matcha-600'}
                  ${isSelected && !isGenerated ? 'ring-2 ring-matcha-600 ring-offset-1' : ''}
                `}>
                  <div className="flex items-center gap-3">
                    {!isGenerated && (
                      <button
                        onClick={() => handleToggle(combo.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-matcha-600 border-matcha-600' : 'border-gray-300'}`}
                      >
                        {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </button>
                    )}
                    {isGenerated && <div className="w-5" />}
                    {combo.scene.url && <img src={getImageUrl(combo.scene.url)} alt={combo.scene.name} className="h-10 w-10 rounded-lg object-cover" />}
                    <span className="text-sm">{combo.scene.name}</span>
                    <span className="text-warm-silver">×</span>
                    <img src={getImageUrl(combo.styleImage.url)} alt="定妆图" className="h-10 w-10 rounded-lg object-cover" />
                    <span className="text-sm text-warm-silver">定妆图</span>
                    <span className="text-xs text-warm-silver ml-2">({selectedPlatform === 'gpt' ? 'GPT' : '即梦'})</span>
                  </div>
                  <Badge variant={isGenerated ? 'success' : 'warning'} className="text-xs">
                    {isGenerated ? '已生成' : '待生成'}
                  </Badge>
                </div>
              )
            })}
          </div>
        </div>
        {stats.pending > 0 && (
          <div className="flex items-center justify-between border-t border-oat px-4 py-3">
            <div className="flex gap-2 text-xs text-warm-silver">
              <button onClick={() => setSelectedCombinations(new Set(filteredCombinations.filter(c => !c.existingFirstFrameId).map(c => c.id)))}>全选待生成</button>
              <span>|</span>
              <button onClick={() => setSelectedCombinations(new Set())}>清空选择</button>
            </div>
            <Button onClick={handleGenerate} disabled={selectedCombinations.size === 0 || generating} className="bg-matcha-600 hover:bg-matcha-500">
              {generating ? '生成中...' : `生成 ${selectedCombinations.size > 0 ? `(${selectedCombinations.size})` : ''}`}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ============ Main Page ============

export default function ModelImagesWizardPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params.id as string
  const [currentStep, setCurrentStep] = useState<Step>('model-image')
  const [completedSteps, setCompletedSteps] = useState<Set<Step>>(new Set())

  const handleStepComplete = () => {
    setCompletedSteps(prev => new Set([...prev, currentStep]))
    if (currentStep === 'model-image') setCurrentStep('style-image')
    else if (currentStep === 'style-image') setCurrentStep('first-frame')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-background to-fuchsia-100">
      <div className="fixed top-20 left-20 w-96 h-96 bg-violet-300/30 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-20 right-20 w-80 h-80 bg-fuchsia-300/30 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/products/${productId}`} className="w-10 h-10 rounded-xl bg-white shadow-md flex items-center justify-center text-gray-500 hover:text-violet-600 hover:shadow-lg transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-warm-charcoal tracking-tight">生图向导</h1>
            <p className="text-sm text-warm-silver mt-0.5">三步生成：模特图 → 定妆图 → 首帧图</p>
          </div>
        </div>

        {/* Step Indicator */}
        <StepIndicator current={currentStep} onStepClick={setCurrentStep} completedSteps={completedSteps} />

        {/* Step Content */}
        {currentStep === 'model-image' && <Step1ModelImage productId={productId} onComplete={handleStepComplete} />}
        {currentStep === 'style-image' && <Step2StyleImage productId={productId} />}
        {currentStep === 'first-frame' && <Step3FirstFrame productId={productId} />}
      </div>
    </div>
  )
}
