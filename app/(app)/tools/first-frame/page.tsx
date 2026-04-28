'use client'

import { useState, useEffect } from 'react'
import { CombinationToolPage } from '@/components/video-generation/CombinationToolPage'
import { CombinationSelector } from '@/components/video-generation/CombinationSelector'
import type { GeneratedCombination } from '@/components/video-generation/types'

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

  const scenes = availableCombinations.map(c => ({
    id: c.scene.id,
    name: c.scene.name,
    url: c.scene.url,
  }))

  const styleImages = availableCombinations.map(c => ({
    id: c.styleImage.id,
    name: `定妆图 ${c.styleImage.id.slice(0, 8)}`,
    url: c.styleImage.url,
  }))

  const existingIds = availableCombinations
    .filter(c => c.existingFirstFrameId)
    .map(c => `${c.scene.id}-${c.styleImage.id}`)

  const handleGenerate = async (combinations: GeneratedCombination[]) => {
    setGenerating(true)
    try {
      for (const combo of combinations) {
        const [sceneId, styleImageId] = combo.key.split('-')
        const comboData = availableCombinations.find(
          (c: any) => c.scene.id === sceneId && c.styleImage.id === styleImageId
        )
        if (!comboData) continue
        await fetch('/api/tools/combination/generate', {
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
      />
    </CombinationToolPage>
  )
}