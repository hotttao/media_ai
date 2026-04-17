'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MaterialCard } from '@/components/material/MaterialCard'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Material {
  id: string
  name: string
  type: string
  url: string
  tags: string | null
  visibility: string
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('ALL')

  useEffect(() => {
    fetch('/api/materials')
      .then(res => res.json())
      .then(data => {
        setMaterials(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filteredMaterials = filter === 'ALL'
    ? materials
    : materials.filter(m => m.type === filter)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-matcha-500 border-t-transparent animate-spin" />
          <p className="text-white/60">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">素材库</h2>
          <span className="px-2 py-0.5 rounded-full text-xs bg-white/10 text-white/60">
            {filteredMaterials.length} 个
          </span>
        </div>
        <button
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-matcha-600 to-matcha-500 text-white font-medium shadow-lg shadow-matcha-500/30 hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
        >
          <span className="text-lg">↑</span>
          上传素材
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-4">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger
            className="w-[180px] rounded-xl"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'white',
            }}
          >
            <SelectValue placeholder="素材类型" />
          </SelectTrigger>
          <SelectContent
            style={{
              background: 'rgba(30,30,30,0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <SelectItem value="ALL" className="text-white">全部类型</SelectItem>
            <SelectItem value="CLOTHING" className="text-white">服装</SelectItem>
            <SelectItem value="SCENE" className="text-white">场景</SelectItem>
            <SelectItem value="ACTION" className="text-white">动作</SelectItem>
            <SelectItem value="MAKEUP" className="text-white">妆容</SelectItem>
            <SelectItem value="ACCESSORY" className="text-white">配饰</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredMaterials.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 rounded-2xl" style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px dashed rgba(255,255,255,0.1)',
        }}>
          <div className="text-6xl mb-4">📦</div>
          <p className="text-white/60 mb-4">还没有上传任何素材</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredMaterials.map((material) => (
            <MaterialCard key={material.id} material={material} />
          ))}
        </div>
      )}
    </div>
  )
}
