'use client'

import { useState, useEffect, useRef } from 'react'
import { MaterialCard } from '@/components/material/MaterialCard'

interface Material {
  id: string
  name: string
  type: string
  url: string
  tags: string | null
  visibility: string
}

function MaterialUploader({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [isLoading, setIsLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState('CLOTHING')
  const [visibility, setVisibility] = useState('PERSONAL')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      setPreviewUrl(URL.createObjectURL(f))
    }
  }

  async function onSubmit() {
    if (!name.trim() || !file) {
      alert('请填写名称并选择文件')
      return
    }

    setIsLoading(true)

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('subDir', 'materials')

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      })

      if (!uploadResponse.ok) throw new Error('文件上传失败')

      const { url } = await uploadResponse.json()

      const materialData = {
        name,
        type,
        visibility,
        description: description || undefined,
        tags: tags ? tags.split(',').map(t => t.trim()) : undefined,
        url,
      }

      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(materialData),
      })

      if (!response.ok) throw new Error('素材创建失败')

      setName('')
      setType('CLOTHING')
      setVisibility('PERSONAL')
      setDescription('')
      setTags('')
      setPreviewUrl(null)
      setFile(null)
      onSuccess()
    } catch (error) {
      alert(error instanceof Error ? error.message : '创建失败')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-white/70">上传素材</h4>
        <button onClick={onClose} className="text-white/40 hover:text-white text-xl">✕</button>
      </div>

      <div className="space-y-4">
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-white/40 mb-1 block">素材类型</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
            >
              <option value="CLOTHING">服装</option>
              <option value="SCENE">场景</option>
              <option value="ACTION">动作</option>
              <option value="MAKEUP">妆容</option>
              <option value="ACCESSORY">配饰</option>
              <option value="OTHER">其他</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">可见性</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
            >
              <option value="PERSONAL">私有</option>
              <option value="TEAM">团队</option>
              <option value="PUBLIC">公共</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-white/40 mb-1 block">素材图片</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <label
            className={`
              relative flex flex-col items-center justify-center rounded-xl cursor-pointer
              transition-all ring-1 ring-white/10 hover:ring-white/20
              ${previewUrl ? '' : 'aspect-video bg-white/5'}
            `}
          >
            {previewUrl ? (
              <>
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                <div
                  className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl"
                  onClick={(e) => {
                    e.preventDefault()
                    setPreviewUrl(null)
                    setFile(null)
                  }}
                >
                  <span className="text-white text-sm">重新上传</span>
                </div>
              </>
            ) : (
              <>
                <span className="text-white/30 text-3xl mb-2">+</span>
                <span className="text-white/30 text-sm">点击上传图片</span>
              </>
            )}
          </label>
        </div>

        <div>
          <label className="text-xs text-white/40 mb-1 block">描述（可选）</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="素材描述"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30"
          />
        </div>

        <div>
          <label className="text-xs text-white/40 mb-1 block">标签（逗号分隔）</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="如: 时尚, 潮流"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30"
          />
        </div>

        <button
          onClick={onSubmit}
          disabled={isLoading || !name.trim() || !file}
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

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('ALL')
  const [showUpload, setShowUpload] = useState(false)

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
  }, [])

  const filteredMaterials = filter === 'ALL'
    ? materials
    : materials.filter(m => m.type === filter)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex gap-2">
        {['ALL', 'CLOTHING', 'SCENE', 'ACTION', 'MAKEUP', 'ACCESSORY', 'OTHER'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-purple-500/30 text-white'
                : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'
            }`}
          >
            {f === 'ALL' ? '全部' :
             f === 'CLOTHING' ? '服装' :
             f === 'SCENE' ? '场景' :
             f === 'ACTION' ? '动作' :
             f === 'MAKEUP' ? '妆容' :
             f === 'ACCESSORY' ? '配饰' : '其他'}
          </button>
        ))}
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
            <MaterialUploader
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
      {filteredMaterials.length === 0 && filter === 'ALL' ? (
        <div
          className="flex flex-col items-center justify-center rounded-2xl cursor-pointer"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '2px dashed rgba(255,255,255,0.1)',
            minHeight: '300px',
          }}
          onClick={() => setShowUpload(true)}
        >
          <div className="text-6xl mb-4 text-white/20">+</div>
          <p className="text-white/60 mb-2">还没有上传任何素材</p>
          <p className="text-white/40 text-sm">点击这里上传素材</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {/* Add Button - always first */}
          <div
            onClick={() => setShowUpload(true)}
            className="flex flex-col items-center justify-center rounded-2xl cursor-pointer transition-all hover:scale-[1.02]"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '2px dashed rgba(255,255,255,0.1)',
              minHeight: '200px',
            }}
          >
            <div className="text-5xl mb-3 text-white/20">+</div>
            <span className="text-white/40 text-sm">上传素材</span>
          </div>

          {filteredMaterials.map((material) => (
            <MaterialCard key={material.id} material={material} />
          ))}
        </div>
      )}
    </div>
  )
}
