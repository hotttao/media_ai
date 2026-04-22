'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { GenerateVideoWizard } from './GenerateVideoWizard'

const audienceConfig = {
  MENS: { label: '男装', gradient: 'from-slate-600 to-zinc-700', textColor: 'text-slate-700' },
  WOMENS: { label: '女装', gradient: 'from-rose-500 to-pink-600', textColor: 'text-rose-700' },
  KIDS: { label: '童装', gradient: 'from-amber-500 to-orange-600', textColor: 'text-amber-700' },
}

export function ProductDetail({ product }: { product: any }) {
  const [isZoomed, setIsZoomed] = useState(false)
  const [showWizard, setShowWizard] = useState(false)

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left: Product Image */}
          <div className="space-y-4">
            {/* Main Image Card */}
            <div
              className="relative aspect-[4/5] rounded-3xl overflow-hidden bg-gradient-to-br from-white to-gray-100 border border-gray-200/50 cursor-zoom-in group shadow-xl shadow-gray-200/50"
              onClick={() => setIsZoomed(true)}
            >
              {mainImage ? (
                <>
                  <Image
                    src={mainImage.url}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
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
                    className="relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 border-gray-200 hover:border-violet-400 transition-all duration-300 group"
                  >
                    <Image
                      src={image.url}
                      alt={`${product.name} ${index + 1}`}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
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
              <button className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-medium shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 transition-all duration-300 flex items-center justify-center gap-2 group active:scale-[0.98]">
                <svg className="w-5 h-5 transition-transform duration-300 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                编辑产品
              </button>
              <button className="py-3.5 px-5 rounded-xl border-2 border-red-400 text-red-500 hover:bg-red-50 font-medium transition-all duration-300 flex items-center justify-center gap-2 group active:scale-[0.98]">
                <svg className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                删除
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
      </div>

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
          <GenerateVideoWizard productId={product.id} />
        </div>
      )}
    </div>
  )
}
