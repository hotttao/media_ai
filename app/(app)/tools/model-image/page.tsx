'use client'

import { useState, useEffect } from 'react'
import { CombinationToolPage } from '@/components/video-generation/CombinationToolPage'
import { CombinationSelector } from '@/components/video-generation/CombinationSelector'
import type { GeneratedCombination } from '@/components/video-generation/types'

interface AvailableCombination {
  id: string
  ip: { id: string; nickname: string; fullBodyUrl?: string }
  product: { id: string; name: string; mainImageUrl?: string }
  existingModelImageId: string | null
}

export default function ModelImagePage() {
  const [loading, setLoading] = useState(true)
  const [availableCombinations, setAvailableCombinations] = useState<AvailableCombination[]>([])
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetch('/api/tools/combination/model-images')
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

  // 转换为 SelectableItem 格式
  const ips = availableCombinations.map(c => ({
    id: c.ip.id,
    name: c.ip.nickname,
    url: c.ip.fullBodyUrl,
  }))

  const products = availableCombinations.map(c => ({
    id: c.product.id,
    name: c.product.name,
    url: c.product.mainImageUrl,
  }))

  // 已生成的组合ID
  const existingIds = availableCombinations
    .filter(c => c.existingModelImageId)
    .map(c => `${c.ip.id}-${c.product.id}`)

  const handleGenerate = async (combinations: GeneratedCombination[]) => {
    setGenerating(true)
    try {
      for (const combo of combinations) {
        const [ipId, productId] = combo.key.split('-')
        await fetch('/api/tools/combination/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'model-image', ipId, productId }),
        })
      }
      alert('生成完成')
      // 刷新页面重新获取数据
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
      title="模特图生成"
      description="选择虚拟IP和产品，生成模特图"
      icon="👗"
    >
      <CombinationSelector
        type="model-image"
        itemsA={ips}
        itemsB={products}
        existingIds={existingIds}
        loading={loading}
        generating={generating}
        onGenerate={handleGenerate}
      />
    </CombinationToolPage>
  )
}