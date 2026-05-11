'use client'

import { useState, useEffect, useCallback } from 'react'
import { CombinationToolPage } from '@/components/video-generation/CombinationToolPage'
import { CombinationSelector } from '@/components/video-generation/CombinationSelector'
import type { GeneratedCombination } from '@/components/video-generation/types'
import { getImageUrl } from '@/foundation/lib/utils'

interface PreviewImage {
  src: string
  alt: string
}

interface AvailableCombination {
  id: string
  pose: { id: string; name: string; url?: string }
  modelImage: { id: string; url: string; productName?: string }
  existingStyleImageId: string | null
}

export default function StyleImagePage() {
  const [loading, setLoading] = useState(true)
  const [availableCombinations, setAvailableCombinations] = useState<AvailableCombination[]>([])
  const [generating, setGenerating] = useState(false)
  const [preview, setPreview] = useState<PreviewImage | null>(null)

  const handlePreview = useCallback((src: string, alt: string) => {
    setPreview({ src, alt })
  }, [])

  useEffect(() => {
    fetch('/api/tools/combination/style-images')
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

  // 姿势去重
  const poseMap = new Map<string, { id: string; name: string; url?: string }>()
  for (const c of availableCombinations) {
    if (!poseMap.has(c.pose.id)) {
      poseMap.set(c.pose.id, { id: c.pose.id, name: c.pose.name, url: c.pose.url })
    }
  }
  const poses = Array.from(poseMap.values())

  // 模特图去重
  const modelImageMap = new Map<string, { id: string; name: string; url: string }>()
  for (const c of availableCombinations) {
    if (!modelImageMap.has(c.modelImage.id)) {
      modelImageMap.set(c.modelImage.id, {
        id: c.modelImage.id,
        name: c.modelImage.productName || `模特图 ${c.modelImage.id.slice(0, 8)}`,
        url: c.modelImage.url,
      })
    }
  }
  const modelImages = Array.from(modelImageMap.values())

  const existingIds = availableCombinations
    .filter(c => c.existingStyleImageId)
    .map(c => `${c.pose.id}::${c.modelImage.id}`)

  const handleGenerate = async (combinations: GeneratedCombination[]) => {
    setGenerating(true)
    try {
      for (const combo of combinations) {
        const [poseId, modelImageId] = combo.key.split('::')
        const res = await fetch('/api/tools/combination/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'style-image', modelImageId, poseId }),
        })
        if (!res.ok) {
          console.error(`Failed to generate: ${poseId}-${modelImageId}`)
        }
      }
      alert('已提交生成任务')
      // Mark selected combinations as pending without reloading page
      const selectedPoseModelPairs = combinations.map(c => c.key)
      setAvailableCombinations(prev => prev.map(c => {
        const comboKey = `${c.pose.id}::${c.modelImage.id}`
        if (selectedPoseModelPairs.includes(comboKey) && !c.existingStyleImageId) {
          return { ...c, existingStyleImageId: 'pending' }
        }
        return c
      }))
    } catch (err) {
      console.error(err)
      alert('生成失败')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <CombinationToolPage
      title="定妆图生成"
      description="选择姿势和模特图，生成定妆图"
      icon="💄"
    >
      <CombinationSelector
        type="style-image"
        itemsA={poses}
        itemsB={modelImages}
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