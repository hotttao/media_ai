'use client'

import { useState, useEffect } from 'react'
import { CombinationToolPage } from '@/components/video-generation/CombinationToolPage'
import { CombinationSelector } from '@/components/video-generation/CombinationSelector'
import type { GeneratedCombination } from '@/components/video-generation/types'

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

  const poses = availableCombinations.map(c => ({
    id: c.pose.id,
    name: c.pose.name,
    url: c.pose.url,
  }))

  const modelImages = availableCombinations.map(c => ({
    id: c.modelImage.id,
    name: `模特图 ${c.modelImage.id.slice(0, 8)}`,
    url: c.modelImage.url,
  }))

  const existingIds = availableCombinations
    .filter(c => c.existingStyleImageId)
    .map(c => `${c.pose.id}-${c.modelImage.id}`)

  const handleGenerate = async (combinations: GeneratedCombination[]) => {
    setGenerating(true)
    try {
      for (const combo of combinations) {
        const [poseId, modelImageId] = combo.key.split('-')
        const res = await fetch('/api/tools/combination/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'style-image', modelImageId, poseId }),
        })
        if (!res.ok) {
          console.error(`Failed to generate: ${poseId}-${modelImageId}`)
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
      />
    </CombinationToolPage>
  )
}