'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { GenerateVideoWizard } from './GenerateVideoWizard'

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

interface GeneratedMaterials {
  modelImages: ModelImage[]
  styleImages: StyleImage[]
  firstFrames: FirstFrame[]
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
  const [activeTab, setActiveTab] = useState<'detail' | 'materials'>('detail')
  const [generatedMaterials, setGeneratedMaterials] = useState<GeneratedMaterials | null>(null)
  const [materialsLoading, setMaterialsLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [productDeleting, setProductDeleting] = useState(false)

  const fetchGeneratedMaterials = () => {
    setMaterialsLoading(true)
    fetch(`/api/products/${product.id}/generated-materials`)
      .then(res => res.json())
      .then(setGeneratedMaterials)
      .finally(() => setMaterialsLoading(false))
  }

  useEffect(() => {
    if (activeTab === 'materials' && !generatedMaterials) {
      fetchGeneratedMaterials()
    }
  }, [activeTab, product.id])

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

  const audience = audienceConfig[product.targetAudience as keyof typeof audienceConfig] || audienceConfig.WOMENS
  const mainImage = product.images?.find((img: any) => img.isMain) || product.images?.[0]
  const tags = useMemo(() => product.tags ? JSON.parse(product.tags) : [], [product.tags])

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-background to-fuchsia-100">
      {/* Floating decorative orbs */}
      <div className="fixed top-20 left-20 w-96 h-96 bg-violet-300/30 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-20 right-20 w-80 h-80 bg-fuchsia-300/30 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative max-w-7xl mx-auto px-6 py-8">
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
        </div>

        {activeTab === 'materials' ? (
          <MaterialsTab
            materials={generatedMaterials}
            loading={materialsLoading}
            onDelete={async (type, id) => {
              const res = await fetch(`/api/products/${product.id}/generated-materials/${type}/${id}`, {
                method: 'DELETE',
              })
              if (!res.ok) {
                throw new Error('Delete failed')
              }
              fetchGeneratedMaterials()
            }}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Left: Product Image */}
            <div className="space-y-4">
              {/* Main Image Card */}
              <div
                className="relative aspect-[9/16] max-w-sm mx-auto rounded-3xl overflow-hidden bg-gradient-to-br from-white to-gray-100 border border-gray-200/50 cursor-zoom-in group shadow-xl shadow-gray-200/50"
                onClick={() => setIsZoomed(true)}
              >
                {mainImage ? (
                  <>
                    <Image
                      src={mainImage.url}
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
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {product.images.map((image: any, index: number) => (
                    <button
                      key={image.id}
                      className="relative flex-shrink-0 w-16 aspect-[9/16] rounded-xl overflow-hidden bg-gray-100 border-2 border-gray-200 hover:border-violet-400 transition-all duration-300 group"
                    >
                      <Image
                        src={image.url}
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
              <SecondaryImagesSection productId={product.id} images={product.images} />
            </div>

            {/* Right: Product Info */}
            <div className="space-y-8 lg:pt-4">
              {/* Title & Tags */}
              <div className="space-y-4">
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
                <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-lg shadow-gray-100">
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

              {/* Display Actions */}
              {product.displayActions && (
                <div className="p-6 rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 shadow-xl">
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
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowWizard(true)}
                  className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-matcha-600 to-matcha-700 hover:from-matcha-500 hover:to-matcha-600 text-white font-medium shadow-lg shadow-matcha-500/30 hover:shadow-matcha-500/50 transition-all duration-300 flex items-center justify-center gap-2 group active:scale-[0.98]"
                >
                  <svg className="w-5 h-5 transition-transform duration-300 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  生成视频
                </button>
                <button
                  onClick={() => router.push(`/products/${product.id}/edit`)}
                  className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-medium shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 transition-all duration-300 flex items-center justify-center gap-2 group active:scale-[0.98]"
                >
                  <svg className="w-5 h-5 transition-transform duration-300 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  编辑产品
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={productDeleting}
                  className="py-3.5 px-5 rounded-xl border-2 border-red-400 text-red-500 hover:bg-red-50 font-medium transition-all duration-300 flex items-center justify-center gap-2 group active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {productDeleting ? '删除中...' : '删除'}
                </button>
              </div>

              {/* Metadata */}
              <div className="pt-6 border-t border-gray-200">
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
              src={mainImage.url}
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
    <div key={id} className="relative group">
      <img
        src={url}
        alt={label}
        className="w-full max-w-44 mx-auto aspect-[9/16] object-contain bg-gray-100 rounded-xl cursor-pointer"
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
    <div className="space-y-8">
      {/* 模特图 (效果图) */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-4">模特图 ({materials.modelImages.length})</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {materials.modelImages.map(m => (
            <div key={m.id} className="relative group">
              <img
                src={m.url}
                alt="模特图"
                className="w-full max-w-44 mx-auto aspect-[9/16] object-contain bg-gray-100 rounded-xl cursor-pointer"
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {materials.styleImages.map(s => (
              renderGeneratedMaterial('styleImage', s.id, s.url, '定妆图')
            ))}
          </div>
        </div>
      )}

      {/* 首帧图 */}
      {materials.firstFrames.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-4">首帧图 ({materials.firstFrames.length})</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {materials.firstFrames.map(f => (
              renderGeneratedMaterial('firstFrame', f.id, f.url, '首帧图')
            ))}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8" onClick={() => setPreviewUrl(null)}>
          <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
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

function SecondaryImagesSection({
  productId,
  images,
}: {
  productId: string
  images: any[]
}) {
  const [secondaryImages, setSecondaryImages] = useState<any[]>(
    images.filter(img => !img.isMain)
  )
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">产品副图</h3>
        <label className="px-3 py-1.5 rounded-lg bg-violet-50 text-violet-600 text-sm font-medium cursor-pointer hover:bg-violet-100 transition-colors flex items-center gap-1.5">
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
        <div className="grid grid-cols-4 gap-3">
          {secondaryImages.map(image => (
            <div key={image.id} className="relative group">
              <div className="relative aspect-[9/16] max-w-28 rounded-xl overflow-hidden bg-gray-100">
                <Image
                  src={image.url}
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
  )
}
