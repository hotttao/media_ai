'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'

export default function ImageBlendPage() {
  const [imageA, setImageA] = useState<string | null>(null)
  const [imageB, setImageB] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const imageARef = useRef<HTMLInputElement>(null)
  const imageBRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (file: File, setImage: (url: string) => void) => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    if (res.ok) {
      const data = await res.json()
      setImage(data.url)
    }
  }

  const handleSubmit = async () => {
    if (!imageA || !imageB || !prompt) {
      setError('请上传两张图片并输入描述')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/tools/image-blend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageA,
          imageB,
          prompt,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setResult(data.outputUrl)
      } else {
        const data = await res.json()
        setError(data.error || '生成失败')
      }
    } catch (e) {
      setError('请求失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-background to-fuchsia-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-500/30">
              <span className="text-2xl">🖼️</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-warm-charcoal tracking-tight">双图编辑</h1>
              <p className="text-warm-silver mt-1">输入两张图片和描述，生成编辑后的图片</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Image A */}
          <div className="space-y-3">
            <h3 className="text-warm-charcoal font-medium">图片 A</h3>
            <div
              onClick={() => imageARef.current?.click()}
                className="relative aspect-[9/16] max-h-80 rounded-2xl border-2 border-dashed border-rose-300/50 bg-white/50 cursor-pointer hover:border-rose-400 hover:bg-white/70 transition-colors overflow-hidden"
            >
              {imageA ? (
                  <Image src={imageA} alt="图片A" fill className="object-contain" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-warm-silver">
                  <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>点击上传</span>
                </div>
              )}
            </div>
            <input
              ref={imageARef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImageUpload(file, setImageA)
              }}
            />
          </div>

          {/* Image B */}
          <div className="space-y-3">
            <h3 className="text-warm-charcoal font-medium">图片 B</h3>
            <div
              onClick={() => imageBRef.current?.click()}
                className="relative aspect-[9/16] max-h-80 rounded-2xl border-2 border-dashed border-cyan-300/50 bg-white/50 cursor-pointer hover:border-cyan-400 hover:bg-white/70 transition-colors overflow-hidden"
            >
              {imageB ? (
                  <Image src={imageB} alt="图片B" fill className="object-contain" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-warm-silver">
                  <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>点击上传</span>
                </div>
              )}
            </div>
            <input
              ref={imageBRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImageUpload(file, setImageB)
              }}
            />
          </div>
        </div>

        {/* Prompt */}
        <div className="mt-6 space-y-3">
          <h3 className="text-warm-charcoal font-medium">编辑描述</h3>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述你想要的效果，例如：将图片B中的人物融合到图片A的场景中"
            className="w-full h-24 px-4 py-3 rounded-xl bg-white/80 border border-oat text-warm-charcoal placeholder:text-warm-silver/50 focus:border-rose-400/50 focus:bg-white outline-none transition-all resize-none"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-300 text-red-600">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={!imageA || !imageB || !prompt || loading}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-medium shadow-lg shadow-rose-500/30 hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                生成中...
              </>
            ) : (
              '生成'
            )}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className="mt-8">
            <h3 className="text-warm-charcoal font-medium mb-3 text-center">生成结果</h3>
          <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-white/80 mx-auto max-w-xs">
              <Image src={result} alt="结果" fill className="object-contain" />
            </div>
          </div>
        )}

        {/* Floating orbs */}
        <div className="fixed top-20 left-20 w-96 h-96 bg-rose-300/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
        <div className="fixed bottom-20 right-20 w-80 h-80 bg-fuchsia-300/20 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
    </div>
  )
}
