'use client'

import { useState, useEffect, useCallback } from 'react'
import { CombinationToolPage } from '@/components/video-generation/CombinationToolPage'
import { CombinationSelector } from '@/components/video-generation/CombinationSelector'
import type { GeneratedCombination } from '@/components/video-generation/types'

interface PreviewImage {
  src: string
  alt: string
}

interface AvailableCombination {
  id: string
  scene: { id: string; name: string; url?: string }
  styleImage: { id: string; url: string }
  productId: string
  ipId: string
  existingFirstFrameId: string | null
}

export default function FirstFramePage() {
  const [loading, setLoading] = useState(true)
  const [availableCombinations, setAvailableCombinations] = useState<AvailableCombination[]>([])
  const [generating, setGenerating] = useState(false)
  const [preview, setPreview] = useState<PreviewImage | null>(null)

  const handlePreview = useCallback((src: string, alt: string) => {
    setPreview({ src, alt })
  }, [])

  useEffect(() => {
    fetch('/api/tools/combination/first-frames')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch')
        return res.json()
      })
      .then(data => {
        setAvailableCombinations(data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  // 场景去重
  const sceneMap = new Map<string, { id: string; name: string; url?: string }>()
  for (const c of availableCombinations) {
    if (!sceneMap.has(c.scene.id)) {
      sceneMap.set(c.scene.id, { id: c.scene.id, name: c.scene.name, url: c.scene.url })
    }
  }
  const scenes = Array.from(sceneMap.values())

  // 定妆图去重
  const styleImageMap = new Map<string, { id: string; name: string; url: string }>()
  for (const c of availableCombinations) {
    if (!styleImageMap.has(c.styleImage.id)) {
      styleImageMap.set(c.styleImage.id, {
        id: c.styleImage.id,
        name: `定妆图 ${c.styleImage.id.slice(0, 8)}`,
        url: c.styleImage.url,
      })
    }
  }
  const styleImages = Array.from(styleImageMap.values())

  const existingIds = availableCombinations
    .filter(c => c.existingFirstFrameId)
    .map(c => `${c.scene.id}::${c.styleImage.id}`)

  const handleGenerate = async (combinations: GeneratedCombination[]) => {
    setGenerating(true)
    try {
      for (const combo of combinations) {
        const [sceneId, styleImageId] = combo.key.split('::')
        const comboData = availableCombinations.find(
          (c: AvailableCombination) => c.scene.id === sceneId && c.styleImage.id === styleImageId
        )
        if (!comboData) continue
        const res = await fetch('/api/tools/combination/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'first-frame',
            styleImageId,
            sceneId,
            productId: comboData.productId,
            ipId: comboData.ipId,
          }),
        })
        if (!res.ok) {
          console.error(`Failed to generate: ${sceneId}-${styleImageId}`)
        }
      }
      alert('生成完成')
      window.location.reload()
    } catch (err) {
      console.error(err)
      alert('生成失败')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <CombinationToolPage
      title="首帧图生成"
      description="选择场景和定妆图，生成首帧图"
      icon="🌄"
    >
      <CombinationSelector
        type="first-frame"
        itemsA={scenes}
        itemsB={styleImages}
        existingIds={existingIds}
        loading={loading}
        generating={generating}
        onGenerate={handleGenerate}
        hideLabelA
        hideLabelB
        onPreview={handlePreview}
      />

      {/* 图片预览弹窗 */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setPreview(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] p-4">
            <button
              className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-white text-gray-700 hover:bg-gray-100 flex items-center justify-center shadow-lg"
              onClick={() => setPreview(null)}
            >
              ✕
            </button>
            <img
              src={preview.src}
              alt={preview.alt}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </CombinationToolPage>
  )
}