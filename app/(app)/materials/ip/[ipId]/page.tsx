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

interface Scene {
  id: string
  materialId: string
  material: {
    id: string
    name: string
    url: string
  }
}

interface Material {
  id: string
  name: string
  type: string
  url: string
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

// Lightbox Slideshow Component
function LightboxSlideshow({
  images,
  onClose
}: {
  images: { url: string; name: string }[]
  onClose: () => void
}) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const goNext = () => setCurrentIndex((prev) => (prev + 1) % images.length)
  const goPrev = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
      onClick={onClose}
    >
      <div className="relative max-w-4xl max-h-[85vh] w-full" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/60 hover:text-white text-2xl"
        >
          ✕
        </button>

        {/* Counter */}
        <div className="absolute -top-10 left-0 text-white/60 text-sm">
          {currentIndex + 1} / {images.length}
        </div>

        {/* Image */}
        <div className="relative flex items-center justify-center h-full">
          <img
            src={images[currentIndex].url}
            alt={images[currentIndex].name}
            className="max-w-full max-h-[70vh] object-contain rounded-lg"
          />
        </div>

        {/* Navigation */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goPrev() }}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 w-10 h-10 rounded-full bg-white/10 text-white/80 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              ←
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goNext() }}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 w-10 h-10 rounded-full bg-white/10 text-white/80 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              →
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function IpMaterialsPage({ params }: { params: { ipId: string } }) {
  const router = useRouter()
  const [materials, setMaterials] = useState<IpMaterial[]>([])
  const [scenes, setScenes] = useState<Scene[]>([])
  const [availableScenes, setAvailableScenes] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [activeTab, setActiveTab] = useState<'MAKEUP' | 'ACCESSORY' | 'CUSTOMIZED_CLOTHING' | 'SCENES'>('MAKEUP')
  const [lightboxImages, setLightboxImages] = useState<{ url: string; name: string }[] | null>(null)
  const [showSceneSelector, setShowSceneSelector] = useState(false)
  const [savingScenes, setSavingScenes] = useState(false)

  const fetchMaterials = () => {
    fetch(`/api/materials/ip/${params.ipId}`)
      .then(res => res.json())
      .then(data => {
        setMaterials(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  const fetchScenes = () => {
    fetch(`/api/ips/${params.ipId}/scenes`)
      .then(res => res.json())
      .then(data => setScenes(data))
      .catch(console.error)
  }

  const fetchAvailableScenes = () => {
    fetch('/api/materials?type=SCENE')
      .then(res => res.json())
      .then(data => setAvailableScenes(data))
      .catch(console.error)
  }

  useEffect(() => {
    fetchMaterials()
    fetchScenes()
    fetchAvailableScenes()
  }, [params.ipId])

  const filteredMaterials = materials.filter(m => m.type === activeTab)

  // Get all fullBodyUrl images for lightbox
  const allFullBodyImages = materials
    .filter(m => m.fullBodyUrl)
    .map(m => ({ url: m.fullBodyUrl!, name: m.name }))

  const handleSaveScenes = async (selectedIds: string[]) => {
    setSavingScenes(true)
    try {
      const res = await fetch(`/api/ips/${params.ipId}/scenes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialIds: selectedIds }),
      })
      if (res.ok) {
        fetchScenes()
        setShowSceneSelector(false)
      }
    } finally {
      setSavingScenes(false)
    }
  }

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
        <button
          onClick={() => setActiveTab('SCENES')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'SCENES'
              ? 'text-white border-b-2 border-purple-500'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          使用场景 ({scenes.length})
        </button>
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

      {/* Scene Selector Modal */}
      {showSceneSelector && (
        <SceneSelectorModal
          availableScenes={availableScenes}
          selectedIds={scenes.map(s => s.materialId)}
          onSave={handleSaveScenes}
          onClose={() => setShowSceneSelector(false)}
          isSaving={savingScenes}
        />
      )}

      {/* Content based on active tab */}
      {activeTab === 'SCENES' ? (
        /* Scenes Tab */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-white/60 text-sm">配置该 IP 可使用的场景素材</p>
            <button
              onClick={() => setShowSceneSelector(true)}
              className="px-4 py-2 rounded-lg bg-violet-600/20 text-violet-400 text-sm hover:bg-violet-600/30 transition-colors"
            >
              配置场景
            </button>
          </div>

          {scenes.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center h-48 rounded-2xl"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px dashed rgba(255,255,255,0.1)',
              }}
            >
              <div className="text-5xl mb-3">🎬</div>
              <p className="text-white/60 mb-1">暂未配置使用场景</p>
              <p className="text-white/40 text-sm">点击「配置场景」添加该IP可用的场景</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {scenes.map((scene) => (
                <div
                  key={scene.id}
                  className="relative aspect-[4/3] rounded-xl overflow-hidden bg-black/30"
                >
                  {scene.material?.url ? (
                    <img
                      src={scene.material.url}
                      alt={scene.material.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white/5">
                      <span className="text-white/20">?</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                    <p className="text-white text-xs truncate">{scene.material?.name || '未知场景'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Material Tabs */
        <>
          {allFullBodyImages.length > 3 && (
            <div className="flex justify-end">
              <button
                onClick={() => setLightboxImages(allFullBodyImages)}
                className="px-4 py-2 rounded-lg bg-white/10 text-white/80 text-sm hover:bg-white/20 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                查看全部 ({allFullBodyImages.length})
              </button>
            </div>
          )}

          {/* Materials Grid - FullBodyUrl thumbnails */}
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
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredMaterials.map((material) => (
                <div
                  key={material.id}
                  className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-black/30 cursor-pointer"
                  onClick={() => material.fullBodyUrl && setLightboxImages([{ url: material.fullBodyUrl, name: material.name }])}
                >
                  {material.fullBodyUrl ? (
                    <>
                      <img
                        src={material.fullBodyUrl}
                        alt={material.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                        <span className="text-white/0 group-hover:text-white text-sm transition-colors">
                          {material.name}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-white/5">
                      <span className="text-white/20 text-3xl mb-1">?</span>
                      <span className="text-white/40 text-xs">{material.name}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Lightbox Slideshow */}
      {lightboxImages && (
        <LightboxSlideshow
          images={lightboxImages}
          onClose={() => setLightboxImages(null)}
        />
      )}

      {/* Floating gradient orbs */}
      <div className="fixed top-1/3 -left-64 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="fixed bottom-1/3 -right-64 w-[400px] h-[400px] bg-fuchsia-600/10 rounded-full blur-[100px] pointer-events-none -z-10" />
    </div>
  )
}

// Scene Selector Modal Component
function SceneSelectorModal({
  availableScenes,
  selectedIds,
  onSave,
  onClose,
  isSaving,
}: {
  availableScenes: Material[]
  selectedIds: string[]
  onSave: (ids: string[]) => void
  onClose: () => void
  isSaving: boolean
}) {
  const [selected, setSelected] = useState<string[]>(selectedIds)

  const toggleScene = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[70vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{
          background: 'linear-gradient(180deg, rgba(30,30,35,0.98) 0%, rgba(20,20,25,0.99) 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">选择使用场景</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {availableScenes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white/60">暂无可用的场景素材</p>
              <p className="text-white/40 text-sm mt-1">请先在素材库上传 SCENE 类型的素材</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {availableScenes.map((scene) => (
                <div
                  key={scene.id}
                  className={`
                    relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer transition-all
                    ${selected.includes(scene.id)
                      ? 'ring-2 ring-violet-500 shadow-lg shadow-violet-500/30'
                      : 'hover:ring-1 hover:ring-white/30'
                    }
                  `}
                  onClick={() => toggleScene(scene.id)}
                >
                  <img
                    src={scene.url}
                    alt={scene.name}
                    className="w-full h-full object-cover"
                  />
                  {selected.includes(scene.id) && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                    <p className="text-white text-xs truncate">{scene.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-white/10 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => onSave(selected)}
            disabled={isSaving}
            className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-medium hover:shadow-lg hover:shadow-violet-500/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                保存中...
              </>
            ) : (
              `保存 (${selected.length})`
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
