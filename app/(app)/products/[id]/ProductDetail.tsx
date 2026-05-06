'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { GenerateVideoWizard } from './GenerateVideoWizard'
import { VideoGrid } from '@/components/video/VideoGrid'
import { getImageUrl } from '@/foundation/lib/utils'
import { useDailyPublishPlan } from '@/components/daily-publish-plan/DailyPublishPlanProvider'
import type { VideoListItem } from '@/components/video/video-types'

// Types for generated materials
interface ModelImage {
  id: string
  productId: string
  ipId: string
  url: string
  createdAt: string
}

interface StyleImage {
  id: string
  productId: string
  ipId: string
  modelImageId: string
  url: string
  poseId: string | null
  createdAt: string
}

interface FirstFrame {
  id: string
  productId: string
  ipId: string
  styleImageId: string | null
  url: string
  sceneId: string | null
  createdAt: string
}

interface AlternativeImage {
  id: string
  materialType: string
  relatedId: string
  url: string
  source: string
  isConfirmed: boolean
  createdAt: string
}

interface GeneratedMaterials {
  modelImages: ModelImage[]
  styleImages: StyleImage[]
  firstFrames: FirstFrame[]
}

interface SceneMaterial {
  id: string
  materialId: string
  material: {
    id: string
    name: string
    url: string
  } | null
}

const audienceConfig = {
  MENS: { label: '男装', gradient: 'from-slate-600 to-zinc-700', textColor: 'text-slate-700' },
  WOMENS: { label: '女装', gradient: 'from-rose-500 to-pink-600', textColor: 'text-rose-700' },
  KIDS: { label: '童装', gradient: 'from-amber-500 to-orange-600', textColor: 'text-amber-700' },
}

export function ProductDetail({ product }: { product: any }) {
  const router = useRouter()
  const [isZoomed, setIsZoomed] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [activeTab, setActiveTab] = useState<'detail' | 'materials' | 'videos'>('detail')
  const [generatedMaterials, setGeneratedMaterials] = useState<GeneratedMaterials | null>(null)
  const [materialsLoading, setMaterialsLoading] = useState(false)
  const [productVideos, setProductVideos] = useState<VideoListItem[]>([])
  const [videosLoading, setVideosLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [productDeleting, setProductDeleting] = useState(false)
  const [productScenes, setProductScenes] = useState<SceneMaterial[]>(product.productScenes || [])
  const [availableScenes, setAvailableScenes] = useState<{ id: string; name: string; url: string }[]>([])
  const [showSceneSelector, setShowSceneSelector] = useState(false)
  const [sceneSaving, setSceneSaving] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  const { addPlan } = useDailyPublishPlan()

  const handleAddToPublishPlan = async () => {
    setIsAdding(true)
    try {
      await addPlan(product.id, new Date().toISOString().split('T')[0])
    } finally {
      setIsAdding(false)
    }
  }

  const fetchGeneratedMaterials = () => {
    setMaterialsLoading(true)
    fetch(`/api/products/${product.id}/generated-materials`)
      .then(res => res.json())
      .then(setGeneratedMaterials)
      .finally(() => setMaterialsLoading(false))
  }

  const fetchProductVideos = () => {
    setVideosLoading(true)
    fetch(`/api/products/${product.id}/videos`)
      .then(res => res.json())
      .then((data) => setProductVideos(Array.isArray(data) ? data : []))
      .finally(() => setVideosLoading(false))
  }

  useEffect(() => {
    if (activeTab === 'materials' && !generatedMaterials) {
      fetchGeneratedMaterials()
    }
  }, [activeTab, product.id])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const syncTabFromHash = () => {
      if (window.location.hash === '#videos') {
        setActiveTab('videos')
      }
    }

    syncTabFromHash()
    window.addEventListener('hashchange', syncTabFromHash)
    return () => window.removeEventListener('hashchange', syncTabFromHash)
  }, [])

  useEffect(() => {
    if (activeTab === 'videos' && productVideos.length === 0) {
      fetchProductVideos()
    }

    if (typeof window !== 'undefined') {
      const nextHash = activeTab === 'videos' ? '#videos' : ''
      window.history.replaceState(null, '', `${window.location.pathname}${nextHash}`)
    }
  }, [activeTab, product.id, productVideos.length])

  useEffect(() => {
    if (!showSceneSelector || availableScenes.length > 0) {
      return
    }

    fetch('/api/materials?type=SCENE')
      .then(res => res.json())
      .then(data => setAvailableScenes(Array.isArray(data) ? data : []))
      .catch(error => console.error('Load available scenes error:', error))
  }, [showSceneSelector, availableScenes.length])

  const handleDeleteProduct = async () => {
    setProductDeleting(true)
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        throw new Error('Delete failed')
      }
      router.push('/products')
      router.refresh()
    } catch (error) {
      console.error(error)
      alert('删除产品失败')
    } finally {
      setProductDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleSaveScenes = async (selectedIds: string[]) => {
    setSceneSaving(true)
    try {
      const res = await fetch(`/api/products/${product.id}/scenes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialIds: selectedIds }),
      })

      if (!res.ok) {
        throw new Error('Save scenes failed')
      }

      const data = await res.json()
      setProductScenes(Array.isArray(data) ? data : [])
      setShowSceneSelector(false)
    } catch (error) {
      console.error(error)
      alert('保存适配场景失败')
    } finally {
      setSceneSaving(false)
    }
  }

  const audience = audienceConfig[product.targetAudience as keyof typeof audienceConfig] || audienceConfig.WOMENS
  const mainImage = product.images?.find((img: any) => img.isMain) || product.images?.[0]
  const tags = useMemo(() => product.tags ? JSON.parse(product.tags) : [], [product.tags])

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-background to-fuchsia-100">
      {/* Floating decorative orbs */}
      <div className="fixed top-20 left-20 w-96 h-96 bg-violet-300/30 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-20 right-20 w-80 h-80 bg-fuchsia-300/30 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Back link */}
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-violet-600 transition-all duration-300 mb-8 group"
        >
          <svg
            className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">返回产品库</span>
        </Link>

        {/* Tab bar */}
        <div className="flex gap-4 border-b border-gray-200 mb-8">
          <button
            onClick={() => setActiveTab('detail')}
            className={`pb-3 px-1 text-sm font-medium transition-all ${
              activeTab === 'detail'
                ? 'text-violet-600 border-b-2 border-violet-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            商品详情
          </button>
          <button
            onClick={() => setActiveTab('materials')}
            className={`pb-3 px-1 text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'materials'
                ? 'text-violet-600 border-b-2 border-violet-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            素材
            {(generatedMaterials?.modelImages.length ?? 0) > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-600 text-xs">
                {generatedMaterials?.modelImages.length ?? 0}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            className={`pb-3 px-1 text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'videos'
                ? 'text-violet-600 border-b-2 border-violet-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            视频
            {productVideos.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-600 text-xs">
                {productVideos.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'materials' ? (
          <MaterialsTab
            materials={generatedMaterials}
            loading={materialsLoading}
            onDelete={async (type, id) => {
              // For firstFrame, check and warn about associated alternative images
              if (type === 'firstFrame') {
                const countRes = await fetch(`/api/products/${product.id}/generated-materials/firstFrame/${id}/alternatives-count`)
                if (countRes.ok) {
                  const { count } = await countRes.json()
                  if (count > 0) {
                    if (!confirm(`删除首帧图将同时删除${count}张关联备选图，是否继续？`)) {
                      return
                    }
                  }
                }
              }
              const res = await fetch(`/api/products/${product.id}/generated-materials/${type}/${id}`, {
                method: 'DELETE',
              })
              if (!res.ok) {
                throw new Error('Delete failed')
              }
              fetchGeneratedMaterials()
            }}
          />
        ) : activeTab === 'videos' ? (
          <VideosTab
            videos={productVideos}
            loading={videosLoading}
            onCreateVideo={() => setShowWizard(true)}
          />
        ) : (
          <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)] xl:gap-10">
            {/* Left: Product Image */}
            <div className="space-y-4 xl:sticky xl:top-8">
              {/* Main Image Card */}
              <div
                className="relative mx-auto aspect-[9/16] w-full max-w-[26rem] cursor-zoom-in overflow-hidden rounded-3xl border border-gray-200/70 bg-gradient-to-br from-white to-gray-100 shadow-xl shadow-gray-200/60 group"
                onClick={() => setIsZoomed(true)}
              >
                {mainImage ? (
                  <>
                    <Image
                      src={getImageUrl(mainImage.url)}
                      alt={product.name}
                      fill
                      className="object-contain transition-transform duration-500 group-hover:scale-105"
                      priority
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 bg-white/95 backdrop-blur-sm px-5 py-2.5 rounded-full shadow-xl translate-y-2 group-hover:translate-y-0">
                        <span className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                          </svg>
                          点击查看大图
                        </span>
                      </div>
                    </div>
                    {/* Audience badge */}
                    <div className={`absolute top-4 left-4 px-3 py-1.5 rounded-full bg-gradient-to-r ${audience.gradient} shadow-lg`}>
                      <span className="text-xs font-semibold text-white">{audience.label}</span>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="text-center text-gray-400">
                      <svg className="w-20 h-20 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm">暂无产品图片</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Thumbnail strip */}
              {product.images && product.images.length > 1 && (
                <div className="mx-auto flex max-w-[26rem] gap-3 overflow-x-auto pb-2">
                  {product.images.map((image: any, index: number) => (
                    <button
                      key={image.id}
                      className="relative flex-shrink-0 w-16 aspect-[9/16] rounded-xl overflow-hidden bg-gray-100 border-2 border-gray-200 hover:border-violet-400 transition-all duration-300 group"
                    >
                      <Image
                        src={getImageUrl(image.url)}
                        alt={`${product.name} ${index + 1}`}
                        fill
                        className="object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                      {image.isMain && (
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs text-center py-0.5 font-medium">
                          主图
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Secondary Images */}
              <SecondaryImagesSection productId={product.id} images={product.images} mainImage={mainImage} />
            </div>

            {/* Right: Product Info */}
            <div className="space-y-6">
              {/* Title & Tags */}
              <div className="space-y-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
                <h1 className="text-4xl font-bold text-gray-900 tracking-tight leading-tight" style={{ fontFeatureSettings: '"ss01", "ss03", "ss10", "ss11", "ss12"' }}>
                  {product.name}
                </h1>

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 rounded-full bg-gray-100 border border-dashed border-gray-300 text-gray-600 text-sm hover:border-violet-400 hover:text-violet-600 transition-all duration-300 cursor-default"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Details */}
              {product.productDetails && (
                <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    产品细节
                  </h2>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {product.productDetails}
                  </p>
                </div>
              )}

              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
                <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                      </svg>
                      服装适配场景
                    </h2>
                    <p className="text-sm text-gray-500">
                      配置这件服装更适合出现在哪些场景里，后续生成首帧时会优先限制在这些场景内。
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSceneSelector(true)}
                    className="px-4 py-2 rounded-xl bg-violet-50 text-violet-600 text-sm font-medium hover:bg-violet-100 transition-colors"
                  >
                    配置场景
                  </button>
                </div>

                {productScenes.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-400">
                    暂未配置适配场景
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {productScenes.map((scene) => (
                      <div key={scene.id} className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100">
                        {scene.material?.url ? (
                          <img src={getImageUrl(scene.material.url)} alt={scene.material.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">?</div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                          <p className="text-xs text-white truncate">{scene.material?.name || '未知场景'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Display Actions */}
              {product.displayActions && (
                <div className="rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-6 shadow-xl">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-white/80 mb-5 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    展示动作
                  </h2>
                  <div className="space-y-3">
                    {product.displayActions.split('\n').filter(Boolean).map((action: string, index: number) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 transition-all duration-300 group"
                      >
                        <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-sm font-bold text-white group-hover:bg-white/30 transition-all duration-300">
                          {index + 1}
                        </span>
                        <p className="text-white/90 leading-relaxed pt-0.5">
                          {action.replace(/^动作\d+:\s*/, '')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-1 gap-3 rounded-3xl border border-gray-200 bg-white p-4 shadow-lg shadow-gray-100 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <button
                  onClick={() => setShowWizard(true)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-matcha-600 to-matcha-700 px-6 py-3.5 font-medium text-white shadow-lg shadow-matcha-500/30 transition-all duration-300 hover:from-matcha-500 hover:to-matcha-600 hover:shadow-matcha-500/50 group active:scale-[0.98]"
                >
                  <svg className="w-5 h-5 transition-transform duration-300 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  生成视频
                </button>
                <button
                  onClick={() => router.push(`/products/${product.id}/model-images-wizard`)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3.5 font-medium text-white shadow-lg shadow-amber-500/30 transition-all duration-300 hover:from-amber-400 hover:to-orange-500 hover:shadow-amber-500/50 group active:scale-[0.98]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707m5.656-5.656l-.707-.707m-4.243 12.243l-.707-.707m-5.656 5.656l-.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                  </svg>
                  生图向导
                </button>
                <button
                  onClick={() => router.push(`/products/${product.id}/video-wizard`)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 px-6 py-3.5 font-medium text-white shadow-lg shadow-rose-500/30 transition-all duration-300 hover:from-rose-400 hover:to-pink-500 hover:shadow-rose-500/50 group active:scale-[0.98]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  生视频
                </button>
                <button
                  onClick={handleAddToPublishPlan}
                  disabled={isAdding}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3.5 font-medium text-white shadow-lg shadow-emerald-500/30 transition-all duration-300 hover:from-emerald-400 hover:to-teal-500 hover:shadow-emerald-500/50 group active:scale-[0.98] disabled:opacity-50"
                >
                  {isAdding ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  )}
                  加入发布计划
                </button>
                <button
                  onClick={() => router.push(`/products/${product.id}/edit`)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3.5 font-medium text-white shadow-lg shadow-violet-500/30 transition-all duration-300 hover:from-violet-500 hover:to-fuchsia-500 hover:shadow-violet-500/50 group active:scale-[0.98]"
                >
                  <svg className="w-5 h-5 transition-transform duration-300 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  编辑产品
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={productDeleting}
                    className="flex items-center justify-center gap-2 rounded-xl border-2 border-red-400 px-5 py-3.5 font-medium text-red-500 transition-all duration-300 hover:bg-red-50 group active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {productDeleting ? '删除中...' : '删除'}
                </button>
              </div>

              {/* Metadata */}
              <div className="border-t border-gray-200 px-1 pt-4">
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <span className="font-mono">{product.id.slice(0, 8)}...</span>
                  <span>{new Date(product.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Zoom Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => !productDeleting && setShowDeleteConfirm(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除产品？</h3>
            <p className="text-sm text-gray-500 mb-6">
              删除后会移除该产品及关联的产品图、模特图、定妆图、首帧图，已生成视频会保留但不再关联此产品。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={productDeleting}
                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleDeleteProduct}
                disabled={productDeleting}
                className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {productDeleting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zoom Modal */}
      {isZoomed && mainImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center cursor-zoom-out p-8 animate-in fade-in duration-200"
          onClick={() => setIsZoomed(false)}
        >
          <div className="relative w-full h-full max-w-5xl max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl">
            <Image
              src={getImageUrl(mainImage.url)}
              alt={product.name}
              fill
              className="object-contain"
            />
          </div>
          <button
            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all duration-300 hover:scale-110 active:scale-95"
            onClick={() => setIsZoomed(false)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/10 text-white/60 text-sm backdrop-blur-sm">
            点击任意处关闭
          </div>
        </div>
      )}

      {/* Generate Video Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 z-50 bg-background">
          <button
            onClick={() => setShowWizard(false)}
            className="absolute top-6 right-6 z-50 w-12 h-12 rounded-full bg-oat-light hover:bg-oat flex items-center justify-center text-warm-charcoal transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <GenerateVideoWizard product={product} />
        </div>
      )}

      {showSceneSelector && (
        <SceneSelectorModal
          availableScenes={availableScenes}
          selectedIds={productScenes.map(scene => scene.materialId)}
          onSave={handleSaveScenes}
          onClose={() => setShowSceneSelector(false)}
          isSaving={sceneSaving}
        />
      )}
    </div>
  )
}

function SceneSelectorModal({
  availableScenes,
  selectedIds,
  onSave,
  onClose,
  isSaving,
}: {
  availableScenes: { id: string; name: string; url: string }[]
  selectedIds: string[]
  onSave: (ids: string[]) => void
  onClose: () => void
  isSaving: boolean
}) {
  const [selected, setSelected] = useState<string[]>(selectedIds)

  const toggleScene = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      <div
        className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">配置服装适配场景</h3>
            <p className="text-sm text-gray-500 mt-1">选择这件服装适合出现的场景。</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>

        <div className="p-6 max-h-[65vh] overflow-y-auto">
          {availableScenes.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">暂无可用场景素材</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {availableScenes.map(scene => (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => toggleScene(scene.id)}
                  className={`relative aspect-[4/3] rounded-xl overflow-hidden text-left transition-all ${
                    selected.includes(scene.id)
                      ? 'ring-2 ring-violet-500 shadow-lg shadow-violet-500/20'
                      : 'hover:ring-2 hover:ring-gray-300'
                  }`}
                >
                  <img src={getImageUrl(scene.url)} alt={scene.name} className="w-full h-full object-cover" />
                  {selected.includes(scene.id) && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-violet-500 text-white flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                    <p className="text-xs text-white truncate">{scene.name}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => onSave(selected)}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {isSaving ? '保存中...' : `保存 (${selected.length})`}
          </button>
        </div>
      </div>
    </div>
  )
}

function MaterialsTab({
  materials,
  loading,
  onDelete,
}: {
  materials: GeneratedMaterials | null
  loading: boolean
  onDelete: (type: string, id: string) => Promise<void>
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [alternatives, setAlternatives] = useState<AlternativeImage[]>([])
  const [showAlternatives, setShowAlternatives] = useState(false)

  useEffect(() => {
    let ignore = false
    if (materials?.firstFrames.length > 0) {
      const ffId = materials.firstFrames[0].id
      fetch(`/api/alternative-images?materialType=FIRST_FRAME&relatedId=${ffId}`)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return res.json()
        })
        .then(data => {
          if (!ignore) setAlternatives(data.alternatives || [])
        })
        .catch(console.error)
    }
    return () => { ignore = true }
  }, [materials?.firstFrames])

  const handleConfirmAlternative = async (alternativeId: string) => {
    if (!confirm('确定使用这张备选图作为主图吗？')) return
    try {
      const ffId = materials.firstFrames[0]?.id
      if (!ffId) return
      const res = await fetch(`/api/alternative-images/${alternativeId}/confirm`, {
        method: 'POST',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || '确认失败')
      }
      // Refresh alternatives
      const altRes = await fetch(`/api/alternative-images?materialType=FIRST_FRAME&relatedId=${ffId}`)
      if (altRes.ok) {
        const altData = await altRes.json()
        setAlternatives(altData.alternatives || [])
      }
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : '确认失败')
    }
  }

  const handleDeleteAlternative = async (alternativeId: string) => {
    if (!confirm('确定删除这张备选图吗？')) return
    try {
      const res = await fetch(`/api/alternative-images/${alternativeId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Delete failed')
      setAlternatives(prev => prev.filter(alt => alt.id !== alternativeId))
    } catch (err) {
      console.error(err)
      alert('删除失败')
    }
  }

  const handleDelete = async (type: string, id: string) => {
    try {
      await onDelete(type, id)
    } catch (error) {
      console.error(error)
      alert('删除失败')
    } finally {
      setDeletingId(null)
    }
  }
  const renderGeneratedMaterial = (type: string, id: string, url: string, label: string) => (
    <div key={id} className="relative group aspect-[9/16] w-full max-w-36">
      <img
        src={getImageUrl(url)}
        alt={label}
        className="h-full w-full cursor-pointer rounded-xl border border-gray-200 bg-gray-100 object-contain"
        onClick={() => setPreviewUrl(url)}
      />
      <button
        onClick={() => setDeletingId(id)}
        className="absolute top-2 right-2 p-2 rounded-lg bg-black/50 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
      {deletingId === id && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-xl" onClick={() => setDeletingId(null)}>
          <div className="text-center p-4" onClick={e => e.stopPropagation()}>
            <p className="text-white mb-4">确认删除？</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/20"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(type, id)}
                className="px-4 py-2 rounded-lg bg-red-600 text-white"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!materials || (materials.modelImages.length === 0 && materials.styleImages.length === 0 && materials.firstFrames.length === 0)) {
    return (
      <div className="text-center py-16 text-gray-400">
        还没有生成任何素材
      </div>
    )
  }

  return (
    <div className="space-y-7 rounded-3xl border border-gray-200 bg-white p-5 shadow-lg shadow-gray-100 sm:p-6">
      {/* 模特图 (效果图) */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-4">模特图 ({materials.modelImages.length})</h3>
        <div className="grid grid-cols-2 justify-items-start gap-3 md:grid-cols-3 lg:grid-cols-4">
          {materials.modelImages.map(m => (
            <div key={m.id} className="relative group aspect-[9/16] w-full max-w-36">
              <img
                src={getImageUrl(m.url)}
                alt="模特图"
                className="h-full w-full cursor-pointer rounded-xl border border-gray-200 bg-gray-100 object-contain"
                onClick={() => setPreviewUrl(m.url)}
              />
              <button
                onClick={() => setDeletingId(m.id)}
                className="absolute top-2 right-2 p-2 rounded-lg bg-black/50 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              {deletingId === m.id && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-xl" onClick={() => setDeletingId(null)}>
                  <div className="text-center p-4" onClick={e => e.stopPropagation()}>
                    <p className="text-white mb-4">确认删除？</p>
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => setDeletingId(null)}
                        className="px-4 py-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/20"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => handleDelete('modelImage', deletingId)}
                        className="px-4 py-2 rounded-lg bg-red-600 text-white"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 定妆图 */}
      {materials.styleImages.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-4">定妆图 ({materials.styleImages.length})</h3>
          <div className="grid grid-cols-2 justify-items-start gap-3 md:grid-cols-3 lg:grid-cols-4">
            {materials.styleImages.map(s => (
              renderGeneratedMaterial('styleImage', s.id, s.url, '定妆图')
            ))}
          </div>
        </div>
      )}

      {/* 首帧图 */}
      {materials.firstFrames.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-4">
            首帧图 ({materials.firstFrames.length})
            {alternatives.length > 0 && (
              <button
                onClick={() => setShowAlternatives(!showAlternatives)}
                className="ml-2 text-xs text-violet-600 hover:text-violet-700 underline"
              >
                {showAlternatives ? '收起' : `+ 备选图 (${alternatives.length})`}
              </button>
            )}
          </h3>
          <div className="grid grid-cols-2 justify-items-start gap-3 md:grid-cols-3 lg:grid-cols-4">
            {materials.firstFrames.map(f => (
              renderGeneratedMaterial('firstFrame', f.id, f.url, '首帧图')
            ))}
          </div>

          {/* Alternative images list */}
          {showAlternatives && alternatives.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-gray-400 mb-2">备选图</p>
              <div className="flex flex-wrap gap-2">
                {alternatives.map(alt => (
                  <div key={alt.id} className="relative group">
                    <img
                      src={getImageUrl(alt.url)}
                      alt="备选图"
                      className="h-20 w-20 rounded-lg object-cover cursor-pointer hover:ring-2 hover:ring-violet-500"
                      onClick={() => handleConfirmAlternative(alt.id)}
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteAlternative(alt.id) }}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                    {alt.isConfirmed && (
                      <span className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1 rounded">✓</span>
                    )}
                    {alt.source === 'AI_GENERATED' && (
                      <span className="absolute bottom-1 right-1 bg-blue-500 text-white text-xs px-1 rounded">AI</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8" onClick={() => setPreviewUrl(null)}>
          <img src={getImageUrl(previewUrl)} alt="Preview" className="max-w-full max-h-full object-contain" />
          <button className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

function VideosTab({
  videos,
  loading,
  onCreateVideo,
}: {
  videos: VideoListItem[]
  loading: boolean
  onCreateVideo: () => void
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5 rounded-3xl border border-gray-200 bg-white p-5 shadow-lg shadow-gray-100 sm:p-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">该商品的全部视频</h2>
        <p className="mt-1 text-sm text-gray-500">
          点击任一视频可进入详情页观看成片，并查看模特图、定妆图、首帧图和动作等生成过程。
        </p>
      </div>

      <div className="[&_h3]:text-gray-900 [&_p]:text-gray-500">
        <VideoGrid
          videos={videos}
          emptyTitle="这个商品还没有视频"
          emptyDescription="先在生成向导里生成或上传视频，完成后会自动出现在这里。"
          emptyActionLabel="生成视频"
          onEmptyActionClick={onCreateVideo}
        />
      </div>
    </div>
  )
}

function SecondaryImagesSection({
  productId,
  images,
  mainImage,
}: {
  productId: string
  images: any[]
  mainImage?: any
}) {
  const [secondaryImages, setSecondaryImages] = useState<any[]>(
    images.filter(img => !img.isMain)
  )
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const createAlternativeImage = async (firstFrameId: string, url: string) => {
  try {
    const altRes = await fetch('/api/alternative-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        materialType: 'FIRST_FRAME',
        relatedId: firstFrameId,
        url: url,
        source: 'USER_UPLOADED',
      }),
    })
    if (!altRes.ok) {
      console.error('Failed to create alternative image:', await altRes.text())
    }
  } catch (err) {
    console.error('Failed to create alternative image:', err)
    // Don't throw - we don't want to fail the whole upload if alternative creation fails
  }
}

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()

      const res2 = await fetch(`/api/products/${productId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: data.url }),
      })
      if (!res2.ok) throw new Error('Failed to save image')
      const newImage = await res2.json()
      setSecondaryImages(prev => [...prev, newImage])

      // Create alternative image record for main image uploads (non-blocking, best effort)
      if (mainImage) {
        const ffRes = await fetch(`/api/products/${productId}/first-frames?mainImageUrl=${encodeURIComponent(mainImage.url)}`)
        if (ffRes.ok) {
          const ffs = await ffRes.json()
          if (ffs.length > 0) {
            createAlternativeImage(ffs[0].id, data.url)
          }
        }
      }
    } catch (err) {
      console.error(err)
      alert('上传失败')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (imageId: string) => {
    try {
      const res = await fetch(`/api/products/${productId}/images/${imageId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Delete failed')
      setSecondaryImages(prev => prev.filter(img => img.id !== imageId))
    } catch (err) {
      console.error(err)
      alert('删除失败')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-lg shadow-gray-100">
      <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">产品副图</h3>
          <label className="flex items-center gap-1.5 rounded-lg bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-600 transition-colors hover:bg-violet-100 cursor-pointer">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          添加副图
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
          />
        </label>
      </div>

      {secondaryImages.length === 0 ? (
        <div className="py-8 text-center text-gray-400 text-sm bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          暂无副图
        </div>
      ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {secondaryImages.map(image => (
            <div key={image.id} className="relative group">
              <div className="relative aspect-[9/16] rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                <Image
                  src={getImageUrl(image.url)}
                  alt="副图"
                  fill
                  className="object-contain"
                />
              </div>
              <button
                onClick={() => setDeletingId(image.id)}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              {deletingId === image.id && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-xl" onClick={() => setDeletingId(null)}>
                  <div className="text-center p-3" onClick={e => e.stopPropagation()}>
                    <p className="text-white text-sm mb-2">确认删除？</p>
                    <div className="flex gap-1.5 justify-center">
                      <button
                        onClick={() => setDeletingId(null)}
                        className="px-3 py-1.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 text-sm"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => handleDelete(image.id)}
                        className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  )
}
