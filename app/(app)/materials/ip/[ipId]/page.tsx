'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { IpMaterialCard } from '@/components/material/IpMaterialCard'

interface IpMaterial {
  id: string
  ipId: string
  type: 'MAKEUP' | 'ACCESSORY' | 'CUSTOMIZED_CLOTHING'
  name: string
  description: string | null
  fullBodyUrl: string | null
  threeViewUrl: string | null
  nineViewUrl: string | null
  createdAt: string
}

interface IpMaterialUploaderProps {
  ipId: string
  onClose: () => void
  onSuccess: () => void
}

function IpMaterialUploader({ ipId, onClose, onSuccess }: IpMaterialUploaderProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [files, setFiles] = useState<Record<string, File>>({})
  const [name, setName] = useState('')
  const [type, setType] = useState<'MAKEUP' | 'ACCESSORY' | 'CUSTOMIZED_CLOTHING'>('MAKEUP')
  const fileInputRefs: Record<string, HTMLInputElement | null> = {}

  const IMAGE_FIELDS = [
    { name: 'fullBody', label: '全身图' },
    { name: 'threeView', label: '三视图' },
    { name: 'nineView', label: '九视图' },
  ]

  const handleFileChange = (fieldName: string, file: File | null) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreviews(prev => ({ ...prev, [fieldName]: url }))
    setFiles(prev => ({ ...prev, [fieldName]: file }))
  }

  async function onSubmit() {
    if (!name.trim()) {
      alert('请输入素材名称')
      return
    }

    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('type', type)

      Object.entries(files).forEach(([key, file]) => {
        formData.append(key, file)
      })

      const response = await fetch(`/api/materials/ip/${ipId}`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('上传失败')

      setName('')
      setType('MAKEUP')
      setPreviews({})
      setFiles({})
      onSuccess()
    } catch (error) {
      alert(error instanceof Error ? error.message : '上传失败')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-white/70">添加 IP 素材</h4>
        <button onClick={onClose} className="text-white/40 hover:text-white text-xl">✕</button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-white/40 mb-1 block">素材名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入素材名称"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">素材类型</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
            >
              <option value="MAKEUP">妆容</option>
              <option value="ACCESSORY">装饰</option>
              <option value="CUSTOMIZED_CLOTHING">定制服装</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {IMAGE_FIELDS.map((field) => {
            const preview = previews[field.name]
            return (
              <div key={field.name}>
                <p className="text-xs text-white/40 mb-1">{field.label}</p>
                <label
                  className={`
                    relative aspect-[9/16] max-h-40 rounded-xl overflow-hidden cursor-pointer block bg-black/20
                    ring-1 ring-white/10 transition-all
                    ${preview ? 'ring-2 ring-fuchsia-500/40' : 'hover:ring-white/20'}
                  `}
                >
                  {preview ? (
                    <>
                      <img src={preview} alt={field.label} className="w-full h-full object-contain" />
                      <div
                        className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"
                        onClick={(e) => {
                          e.preventDefault()
                          setPreviews(prev => {
                            const next = { ...prev }
                            delete next[field.name]
                            return next
                          })
                          setFiles(prev => {
                            const next = { ...prev }
                            delete next[field.name]
                            return next
                          })
                        }}
                      >
                        <span className="text-white text-xs">移除</span>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-white/5">
                      <span className="text-white/30 text-xl mb-1">+</span>
                      <span className="text-white/30 text-xs">点击上传</span>
                    </div>
                  )}
                  <input
                    ref={(el) => { fileInputRefs[field.name] = el }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(field.name, e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            )
          })}
        </div>

        <button
          onClick={onSubmit}
          disabled={isLoading || !name.trim()}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-medium shadow-lg shadow-fuchsia-500/20 hover:shadow-xl hover:scale-[1.01] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              上传中...
            </>
          ) : (
            '确认上传'
          )}
        </button>
      </div>
    </div>
  )
}

export default function IpMaterialsPage({ params }: { params: { ipId: string } }) {
  const router = useRouter()
  const [materials, setMaterials] = useState<IpMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [activeTab, setActiveTab] = useState<'MAKEUP' | 'ACCESSORY' | 'CUSTOMIZED_CLOTHING'>('MAKEUP')

  const fetchMaterials = () => {
    fetch(`/api/materials/ip/${params.ipId}`)
      .then(res => res.json())
      .then(data => {
        setMaterials(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    fetchMaterials()
  }, [params.ipId])

  const filteredMaterials = materials.filter(m => m.type === activeTab)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">IP 素材</h2>
          <span className="px-2 py-0.5 rounded-full text-xs bg-white/10 text-white/60">
            {materials.length} 个
          </span>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-medium shadow-lg shadow-fuchsia-500/20 hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2"
        >
          <span className="text-lg">+</span>
          添加素材
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10">
        {(['MAKEUP', 'ACCESSORY', 'CUSTOMIZED_CLOTHING'] as const).map((tab) => {
          const count = materials.filter(m => m.type === tab).length
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-white border-b-2 border-purple-500'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              {tab === 'MAKEUP' ? '妆容' : tab === 'ACCESSORY' ? '装饰' : '定制服装'} ({count})
            </button>
          )
        })}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowUpload(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 backdrop-blur-xl"
            style={{
              background: 'rgba(30,30,30,0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <IpMaterialUploader
              ipId={params.ipId}
              onClose={() => setShowUpload(false)}
              onSuccess={() => {
                setShowUpload(false)
                fetchMaterials()
              }}
            />
          </div>
        </div>
      )}

      {/* Materials Grid */}
      {filteredMaterials.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center h-64 rounded-2xl"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px dashed rgba(255,255,255,0.1)',
          }}
        >
          <div className="text-6xl mb-4">✨</div>
          <p className="text-white/60 mb-2">还没有{activeTab === 'MAKEUP' ? '妆容' : activeTab === 'ACCESSORY' ? '装饰' : '定制服装'}素材</p>
          <p className="text-white/40 text-sm">点击上方「添加素材」开始上传</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMaterials.map((material) => (
            <IpMaterialCard key={material.id} material={material} />
          ))}
        </div>
      )}
    </div>
  )
}
