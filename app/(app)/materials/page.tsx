'use client'

import { useState, useEffect, useRef } from 'react'
import { MaterialCard } from '@/components/material/MaterialCard'
import { MaterialUploader } from '@/components/material/MaterialUploader'

interface Material {
  id: string
  name: string
  type: string
  url: string
  tags: string | null
  visibility: string
}

const typeOptions = [
  { value: 'ALL', label: '全部', gradient: 'from-gray-500/20 to-slate-600/20' },
  { value: 'SCENE', label: '场景', gradient: 'from-emerald-500/20 to-teal-600/20', accent: '#34d399' },
  { value: 'POSE', label: '姿势', gradient: 'from-orange-500/20 to-red-500/20', accent: '#fb923c' },
  { value: 'MAKEUP', label: '妆容', gradient: 'from-pink-500/20 to-rose-600/20', accent: '#f472b6' },
  { value: 'ACCESSORY', label: '配饰', gradient: 'from-violet-500/20 to-purple-600/20', accent: '#a78bfa' },
  { value: 'OTHER', label: '其他', gradient: 'from-gray-500/20 to-zinc-600/20', accent: '#94a3b8' },
]

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('ALL')
  const [showUpload, setShowUpload] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const fetchMaterials = () => {
    fetch('/api/materials')
      .then(res => res.json())
      .then(data => {
        setMaterials(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    fetchMaterials()
    setLoaded(true)
  }, [])

  const filteredMaterials = filter === 'ALL'
    ? materials
    : materials.filter(m => m.type === filter)

  const selectedFilter = typeOptions.find(o => o.value === filter) || typeOptions[0]

  return (
    <div className={`min-h-screen transition-all duration-700 ${loaded ? 'opacity-100' : 'opacity-0'}`}>
      {/* Hero Section */}
      <div className="relative mb-10 overflow-hidden rounded-3xl">
        {/* Background gradient mesh */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/40 via-teal-900/30 to-emerald-900/40" />
        <div className="absolute inset-0 backdrop-blur-xl" />

        {/* Animated gradient orbs */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />

        {/* Content */}
        <div className="relative p-10">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">素材库</h1>
              <p className="text-white/60 mt-1">管理视频生成素材资产</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-8 mt-6">
            <div className="relative">
              <span className="text-4xl font-bold text-white">{materials.length}</span>
              <span className="text-white/40 ml-2">个素材</span>
            </div>
            <div className="w-px h-12 bg-white/10" />
            <div className="relative">
              <span className="text-4xl font-bold text-white">
                {[...new Set(materials.map(m => m.type))].length}
              </span>
              <span className="text-white/40 ml-2">种类型</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-black/40 rounded-2xl p-4 mb-8 border border-white/5">
        <div className="flex items-center gap-4">
          {/* Search input */}
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              placeholder="搜索素材..."
              className="
                w-full pl-12 pr-4 py-3 rounded-xl
                bg-white/5 border border-white/10
                text-white placeholder:text-white/30
                focus:outline-none focus:border-cyan-500/50 focus:bg-white/10
                transition-all duration-300
              "
            />
          </div>

          {/* Add button */}
          <button
            onClick={() => setShowUpload(true)}
            className="
              flex items-center gap-2 px-6 py-3 rounded-xl
              bg-gradient-to-r from-cyan-600 to-emerald-600
              text-white font-medium shadow-lg shadow-cyan-500/30
              hover:shadow-xl hover:scale-[1.02]
              transition-all duration-300
            "
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            上传素材
          </button>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
          {typeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={`
                relative px-5 py-2 rounded-full text-sm font-medium
                transition-all duration-300 whitespace-nowrap
                ${filter === option.value
                  ? 'text-white'
                  : 'text-white/50 hover:text-white/70'
                }
              `}
            >
              {filter === option.value && (
                <span
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `linear-gradient(135deg, ${option.gradient.replace('/20', '/30')}, ${option.gradient.replace('/20', '/15')})`,
                    border: `1px solid ${option.accent || 'rgba(255,255,255,0.2)'}40`,
                  }}
                />
              )}
              <span className="relative z-10">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowUpload(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
            style={{
              background: 'linear-gradient(180deg, rgba(20,30,35,0.98) 0%, rgba(15,20,25,0.99) 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <MaterialUploader
                onClose={() => setShowUpload(false)}
                onSuccess={() => {
                  fetchMaterials()
                  setShowUpload(false)
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Materials Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDelay: '0.5s' }} />
          </div>
        </div>
      ) : filteredMaterials.length === 0 && filter === 'ALL' ? (
        <div
          className="
            relative flex flex-col items-center justify-center
            py-24 rounded-3xl overflow-hidden
            border border-dashed border-white/10
          "
          style={{ background: 'linear-gradient(135deg, rgba(20,100,100,0.1) 0%, rgba(30,30,40,0.5) 100%)' }}
        >
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />

          <div className="relative text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
              <svg className="w-12 h-12 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white/80 mb-2">还没有上传任何素材</h3>
            <p className="text-white/40 mb-6 max-w-sm">
              上传服装、场景、动作等素材，用于视频生成
            </p>
            <button
              onClick={() => setShowUpload(true)}
              className="
                inline-flex items-center gap-2 px-6 py-3 rounded-xl
                bg-gradient-to-r from-cyan-600 to-emerald-600
                text-white font-medium shadow-lg
                hover:shadow-xl hover:scale-[1.02]
                transition-all duration-300
              "
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              点击上传素材
            </button>
          </div>
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-white/40">没有找到匹配 {selectedFilter.label} 类型的素材</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {filteredMaterials.map((material, index) => (
            <div
              key={material.id}
              className="animate-in"
              style={{
                animationDuration: '500ms',
                animationDelay: `${index * 50}ms`,
                animationFillMode: 'backwards',
              }}
            >
              <MaterialCard material={material} />
            </div>
          ))}
        </div>
      )}

      {/* Floating gradient orbs for atmosphere */}
      <div className="fixed top-1/3 -left-64 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="fixed bottom-1/3 -right-64 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none -z-10" />
    </div>
  )
}
