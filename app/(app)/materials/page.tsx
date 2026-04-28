'use client'

import { useEffect, useState } from 'react'
import { MaterialCard } from '@/components/material/MaterialCard'
import { MaterialUploader } from '@/components/material/MaterialUploader'
import { MovementCard } from '@/components/movement/MovementCard'
import { MovementForm } from '@/components/movement/MovementForm'
import { getVisibleCollections, type MaterialFilter } from './view-state'
import { getImageUrl } from '@/foundation/lib/utils'

interface Material {
  id: string
  name: string
  type: string
  url: string
  tags: string | null
  visibility: string
  description?: string | null
  prompt?: string | null
}

interface MovementMaterial {
  id: string
  url: string | null
  content: string
  clothing: string | null
  scope: string | null
  isGeneral: boolean
  poseIds: string[]
  createdAt: string
}

interface EditFormData {
  name: string
  type: string
  visibility: string
  description: string
  prompt: string
  tags: string
}

const typeOptions: Array<{
  value: MaterialFilter
  label: string
  gradient: string
  accent?: string
}> = [
  { value: 'ALL', label: '全部', gradient: 'from-gray-500/20 to-slate-600/20' },
  { value: 'SCENE', label: '场景', gradient: 'from-emerald-500/20 to-teal-600/20', accent: '#34d399' },
  { value: 'POSE', label: '姿势', gradient: 'from-orange-500/20 to-red-500/20', accent: '#fb923c' },
  { value: 'MAKEUP', label: '妆容', gradient: 'from-pink-500/20 to-rose-600/20', accent: '#f472b6' },
  { value: 'ACCESSORY', label: '配饰', gradient: 'from-violet-500/20 to-purple-600/20', accent: '#a78bfa' },
  { value: 'ACTION', label: '动作', gradient: 'from-sky-500/20 to-cyan-600/20', accent: '#38bdf8' },
  { value: 'OTHER', label: '其他', gradient: 'from-gray-500/20 to-zinc-600/20', accent: '#94a3b8' },
]

function getMaterialTypeLabel(type: string) {
  switch (type) {
    case 'SCENE':
      return '场景'
    case 'POSE':
      return '姿势'
    case 'MAKEUP':
      return '妆容'
    case 'ACCESSORY':
      return '配饰'
    case 'ACTION':
      return '动作'
    default:
      return type
  }
}

function getMaterialTypeStyle(type: string) {
  switch (type) {
    case 'SCENE':
      return { background: 'rgba(52,211,153,0.2)', color: '#34d399' }
    case 'POSE':
      return { background: 'rgba(251,146,60,0.2)', color: '#fb923c' }
    case 'MAKEUP':
      return { background: 'rgba(244,114,182,0.2)', color: '#f472b6' }
    case 'ACCESSORY':
      return { background: 'rgba(167,139,250,0.2)', color: '#a78bfa' }
    case 'ACTION':
      return { background: 'rgba(56,189,248,0.2)', color: '#38bdf8' }
    default:
      return { background: 'rgba(148,163,184,0.2)', color: '#94a3b8' }
  }
}

function getVisibilityStyle(visibility: string) {
  switch (visibility) {
    case 'PUBLIC':
      return { background: 'rgba(34,197,94,0.2)', color: '#22c55e', label: '公共' }
    case 'TEAM':
      return { background: 'rgba(59,130,246,0.2)', color: '#3b82f6', label: '团队' }
    case 'PERSONAL':
      return { background: 'rgba(156,163,175,0.2)', color: '#9ca3af', label: '私有' }
    default:
      return { background: 'rgba(156,163,175,0.2)', color: '#9ca3af', label: visibility }
  }
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [movements, setMovements] = useState<MovementMaterial[]>([])
  const [materialsLoading, setMaterialsLoading] = useState(true)
  const [movementsLoading, setMovementsLoading] = useState(true)
  const [filter, setFilter] = useState<MaterialFilter>('ALL')
  const [loaded, setLoaded] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [showMovementForm, setShowMovementForm] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  const [selectedMovement, setSelectedMovement] = useState<MovementMaterial | null>(null)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [editingMovement, setEditingMovement] = useState<MovementMaterial | null>(null)
  const [editForm, setEditForm] = useState<EditFormData>({
    name: '',
    type: '',
    visibility: '',
    description: '',
    prompt: '',
    tags: '',
  })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showMovementDeleteConfirm, setShowMovementDeleteConfirm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const fetchMaterials = () => {
    fetch('/api/materials')
      .then((res) => res.json())
      .then((data) => {
        setMaterials(Array.isArray(data) ? data : [])
        setMaterialsLoading(false)
      })
      .catch(() => setMaterialsLoading(false))
  }

  const fetchMovements = () => {
    fetch('/api/movements')
      .then((res) => res.json())
      .then((data) => {
        setMovements(Array.isArray(data) ? data : [])
        setMovementsLoading(false)
      })
      .catch(() => setMovementsLoading(false))
  }

  useEffect(() => {
    fetchMaterials()
    fetchMovements()
    setLoaded(true)
  }, [])

  const handleEditMaterial = (material: Material) => {
    const tags = material.tags ? JSON.parse(material.tags as string) : []
    setEditForm({
      name: material.name,
      type: material.type,
      visibility: material.visibility,
      description: material.description || '',
      prompt: material.prompt || '',
      tags: tags.join(', '),
    })
    setEditingMaterial(material)
  }

  const handleSaveMaterialEdit = async () => {
    if (!editingMaterial) return

    setIsSaving(true)
    try {
      const tags = editForm.tags
        ? editForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
        : []

      const res = await fetch(`/api/materials/${editingMaterial.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          type: editForm.type,
          visibility: editForm.visibility,
          description: editForm.description || null,
          prompt: editForm.prompt || null,
          tags,
        }),
      })

      if (res.ok) {
        setEditingMaterial(null)
        fetchMaterials()
        if (selectedMaterial?.id === editingMaterial.id) {
          setSelectedMaterial({
            ...selectedMaterial,
            name: editForm.name,
            type: editForm.type,
            visibility: editForm.visibility,
            description: editForm.description,
            prompt: editForm.prompt,
            tags: JSON.stringify(tags),
          })
        }
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteMaterial = async () => {
    if (!selectedMaterial) return

    setIsSaving(true)
    try {
      const res = await fetch(`/api/materials/${selectedMaterial.id}`, { method: 'DELETE' })
      if (res.ok) {
        setShowDeleteConfirm(false)
        setSelectedMaterial(null)
        fetchMaterials()
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateMovement = async (data: {
    url?: string
    content?: string
    clothing?: string
    scope?: string
    isGeneral?: boolean
    poseIds?: string[]
  }) => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        setShowMovementForm(false)
        fetchMovements()
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditMovement = (movement: MovementMaterial) => {
    setEditingMovement(movement)
    setShowMovementForm(true)
  }

  const handleUpdateMovement = async (data: {
    url?: string
    content?: string
    clothing?: string
    scope?: string
    isGeneral?: boolean
    poseIds?: string[]
  }) => {
    if (!editingMovement) return

    setIsSaving(true)
    try {
      const res = await fetch(`/api/movements/${editingMovement.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        setShowMovementForm(false)
        setEditingMovement(null)
        fetchMovements()
        if (selectedMovement?.id === editingMovement.id) {
          setSelectedMovement({
            ...selectedMovement,
            url: data.url || null,
            content: data.content || '',
            clothing: data.clothing || null,
            scope: data.scope || null,
            isGeneral: data.isGeneral ?? selectedMovement.isGeneral,
            poseIds: data.poseIds ?? selectedMovement.poseIds,
          })
        }
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteMovement = async () => {
    if (!selectedMovement) return

    setIsSaving(true)
    try {
      const res = await fetch(`/api/movements/${selectedMovement.id}`, { method: 'DELETE' })
      if (res.ok) {
        setShowMovementDeleteConfirm(false)
        setSelectedMovement(null)
        fetchMovements()
      }
    } finally {
      setIsSaving(false)
    }
  }

  const totalAssetCount = materials.length + movements.length
  const categoryCount = [...new Set(materials.map((material) => material.type))].length + (movements.length > 0 ? 1 : 0)
  const isLoading = materialsLoading || movementsLoading
  const selectedFilter = typeOptions.find((option) => option.value === filter) || typeOptions[0]
  const {
    materials: filteredMaterials,
    movements: filteredMovements,
    hasVisibleAssets,
    isActionView,
    primaryActionLabel,
  } = getVisibleCollections(filter, materials, movements)

  return (
    <div className={`min-h-screen transition-all duration-700 ${loaded ? 'opacity-100' : 'opacity-0'}`}>
      <div className="relative mb-10 overflow-hidden rounded-3xl">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/40 via-slate-900/30 to-emerald-900/40" />
        <div className="absolute inset-0 backdrop-blur-xl" />
        <div className="absolute top-0 right-1/4 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-1/4 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />

        <div className="relative p-10">
          <div className="mb-3 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 shadow-lg shadow-cyan-500/30">
              <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">核心素材库</h1>
              <p className="mt-1 text-white/60">统一管理场景、姿势、妆容、配饰和动作素材</p>
            </div>
          </div>

          <div className="mt-6 flex gap-8">
            <div>
              <span className="text-4xl font-bold text-white">{totalAssetCount}</span>
              <span className="ml-2 text-white/40">个素材</span>
            </div>
            <div className="h-12 w-px bg-white/10" />
            <div>
              <span className="text-4xl font-bold text-white">{categoryCount}</span>
              <span className="ml-2 text-white/40">类资产</span>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-30 mb-8 rounded-2xl border border-white/5 bg-black/40 p-4 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {typeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`
                  relative whitespace-nowrap rounded-full px-5 py-2 text-sm font-medium transition-all duration-300
                  ${filter === option.value ? 'text-white' : 'text-white/50 hover:text-white/70'}
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

          <button
            onClick={() => {
              if (isActionView) {
                setEditingMovement(null)
                setShowMovementForm(true)
                return
              }
              setShowUpload(true)
            }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 px-6 py-3 font-medium text-white shadow-lg shadow-cyan-500/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {primaryActionLabel}
          </button>
        </div>
      </div>

      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md" onClick={() => setShowUpload(false)}>
          <div
            className="w-full max-w-md overflow-hidden rounded-3xl shadow-2xl"
            style={{
              background: 'linear-gradient(180deg, rgba(20,30,35,0.98) 0%, rgba(15,20,25,0.99) 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            onClick={(event) => event.stopPropagation()}
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

      {showMovementForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md" onClick={() => setShowMovementForm(false)}>
          <div
            className="w-full max-w-md overflow-hidden rounded-3xl shadow-2xl"
            style={{
              background: 'linear-gradient(180deg, rgba(20,30,35,0.98) 0%, rgba(15,20,25,0.99) 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">
                {editingMovement ? '编辑动作' : '创建动作'}
              </h3>
              <MovementForm
                movement={editingMovement || undefined}
                onSubmit={editingMovement ? handleUpdateMovement : handleCreateMovement}
                onCancel={() => {
                  setShowMovementForm(false)
                  setEditingMovement(null)
                }}
              />
              {isSaving && <p className="mt-3 text-sm text-white/40">保存中...</p>}
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="relative">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-cyan-500/20 border-t-cyan-500" />
            <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-500" style={{ animationDirection: 'reverse', animationDelay: '0.5s' }} />
          </div>
        </div>
      ) : !hasVisibleAssets && filter === 'ALL' ? (
        <div
          className="relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed border-white/10 py-24"
          style={{ background: 'linear-gradient(135deg, rgba(20,100,100,0.1) 0%, rgba(30,30,40,0.5) 100%)' }}
        >
          <div className="absolute left-0 top-0 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative text-center">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white/5">
              <svg className="h-12 w-12 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-semibold text-white/80">还没有上传任何素材</h3>
            <p className="mb-6 max-w-sm text-white/40">
              上传图片素材，或者切到动作标签创建文字动作和参考视频动作。
            </p>
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 px-6 py-3 font-medium text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              点击上传素材
            </button>
          </div>
        </div>
      ) : !hasVisibleAssets && isActionView ? (
        <div
          className="relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed border-sky-500/20 py-24"
          style={{ background: 'linear-gradient(135deg, rgba(14,116,144,0.12) 0%, rgba(15,20,25,0.45) 100%)' }}
        >
          <div className="absolute left-0 top-0 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative text-center">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white/5">
              <svg className="h-12 w-12 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-semibold text-white/80">还没有动作素材</h3>
            <p className="mb-6 max-w-sm text-white/40">
              上传参考视频动作，或者直接创建文字动作。动作创建后会展示在这里。
            </p>
            <button
              onClick={() => {
                setEditingMovement(null)
                setShowMovementForm(true)
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-6 py-3 font-medium text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              上传动作
            </button>
          </div>
        </div>
      ) : !hasVisibleAssets ? (
        <div className="py-16 text-center">
          <p className="text-white/40">没有找到匹配 {selectedFilter.label} 的素材</p>
        </div>
      ) : (
        <div className="space-y-10">
          {filteredMaterials.length > 0 && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">图片素材</h2>
                <span className="text-sm text-white/40">{filteredMaterials.length} 个</span>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(128px,150px))] justify-center gap-3.5 sm:gap-4">
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
                    <MaterialCard material={material} onClick={() => setSelectedMaterial(material)} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {filteredMovements.length > 0 && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">动作素材</h2>
                <span className="text-sm text-white/40">{filteredMovements.length} 个</span>
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {filteredMovements.map((movement) => (
                  <MovementCard
                    key={movement.id}
                    movement={movement}
                    onClick={() => setSelectedMovement(movement)}
                    onEdit={handleEditMovement}
                    onDelete={(id) => {
                      const movement = movements.find((item) => item.id === id)
                      if (!movement) return
                      setSelectedMovement(movement)
                      setShowMovementDeleteConfirm(true)
                    }}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {selectedMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md" onClick={() => setSelectedMaterial(null)}>
          <div
            className="w-full max-w-md overflow-hidden rounded-3xl shadow-2xl"
            style={{
              background: 'linear-gradient(180deg, rgba(20,30,35,0.98) 0%, rgba(15,20,25,0.99) 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative aspect-[4/5] overflow-hidden bg-black">
              <img src={getImageUrl(selectedMaterial.url)} alt={selectedMaterial.name} className="h-full w-full object-cover" />
              <button
                onClick={() => setSelectedMaterial(null)}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white/70 transition-colors hover:bg-black/70"
              >
                ×
              </button>
            </div>

            <div className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-full px-2 py-1 text-xs font-medium" style={getMaterialTypeStyle(selectedMaterial.type)}>
                  {getMaterialTypeLabel(selectedMaterial.type)}
                </span>
                <span className="rounded-full px-2 py-1 text-xs" style={getVisibilityStyle(selectedMaterial.visibility)}>
                  {getVisibilityStyle(selectedMaterial.visibility).label}
                </span>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">{selectedMaterial.name}</h3>
              {selectedMaterial.description && (
                <p className="mb-3 text-sm text-white/60">{selectedMaterial.description}</p>
              )}
              {selectedMaterial.prompt && (
                <div className="mb-4 rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3">
                  <p className="mb-1 text-xs uppercase tracking-wide text-cyan-300/80">Prompt</p>
                  <p className="text-sm text-cyan-100/90">{selectedMaterial.prompt}</p>
                </div>
              )}
              {selectedMaterial.tags && (
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {JSON.parse(selectedMaterial.tags as string).map((tag: string) => (
                    <span
                      key={tag}
                      className="rounded-full px-2 py-0.5 text-xs"
                      style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2 border-t border-white/10 pt-2">
                <button
                  onClick={() => handleEditMaterial(selectedMaterial)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-white/80 transition-colors hover:bg-white/20"
                >
                  编辑
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="rounded-xl bg-red-500/20 px-4 py-2.5 text-red-400 transition-colors hover:bg-red-500/30"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedMovement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md" onClick={() => setSelectedMovement(null)}>
          <div
            className="w-full max-w-md overflow-hidden rounded-3xl shadow-2xl"
            style={{
              background: 'linear-gradient(180deg, rgba(20,30,35,0.98) 0%, rgba(15,20,25,0.99) 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-sky-900/50 to-cyan-900/30">
              {selectedMovement.url ? (
                <video src={getImageUrl(selectedMovement.url)} controls className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center p-6 text-center text-white/80">
                  <p className="text-base leading-7">{selectedMovement.content || '未填写动作描述'}</p>
                </div>
              )}
              <button
                onClick={() => setSelectedMovement(null)}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white/70 transition-colors hover:bg-black/70"
              >
                ×
              </button>
            </div>

            <div className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-full px-2 py-1 text-xs font-medium" style={getMaterialTypeStyle('ACTION')}>
                  动作
                </span>
                <span
                  className={`rounded-full px-2 py-1 text-xs ${
                    selectedMovement.isGeneral
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {selectedMovement.isGeneral ? '通用动作' : '专用动作'}
                </span>
                <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/60">
                  {selectedMovement.url ? '参考视频' : '文字动作'}
                </span>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">动作详情</h3>
              {selectedMovement.content ? (
                <p className="mb-3 text-sm text-white/70">{selectedMovement.content}</p>
              ) : (
                <p className="mb-3 text-sm text-white/40">未填写动作描述</p>
              )}
              {selectedMovement.url && (
                <a
                  href={selectedMovement.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mb-3 block break-all text-sm text-cyan-400 underline-offset-2 hover:underline"
                >
                  {selectedMovement.url}
                </a>
              )}
              {selectedMovement.clothing && (
                <p className="mb-1 text-sm text-white/55">穿戴服装：{selectedMovement.clothing}</p>
              )}
              {selectedMovement.scope && (
                <p className="mb-4 text-sm text-white/55">适用范围：{selectedMovement.scope}</p>
              )}
              {!selectedMovement.isGeneral && (
                <p className="mb-4 text-sm text-white/55">已关联姿势：{selectedMovement.poseIds.length} 个</p>
              )}
              <div className="flex gap-2 border-t border-white/10 pt-2">
                <button
                  onClick={() => {
                    setEditingMovement(selectedMovement)
                    setShowMovementForm(true)
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-white/80 transition-colors hover:bg-white/20"
                >
                  编辑
                </button>
                <button
                  onClick={() => setShowMovementDeleteConfirm(true)}
                  className="rounded-xl bg-red-500/20 px-4 py-2.5 text-red-400 transition-colors hover:bg-red-500/30"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingMaterial && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md" onClick={() => setEditingMaterial(null)}>
          <div
            className="w-full max-w-md overflow-hidden rounded-3xl shadow-2xl"
            style={{
              background: 'linear-gradient(180deg, rgba(20,30,35,0.98) 0%, rgba(15,20,25,0.99) 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">编辑素材</h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm text-white/60">名称</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-cyan-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-white/60">类型</label>
                  <select
                    value={editForm.type}
                    onChange={(event) => setEditForm({ ...editForm, type: event.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-cyan-500/50 focus:outline-none"
                  >
                    <option value="SCENE">场景</option>
                    <option value="POSE">姿势</option>
                    <option value="MAKEUP">妆容</option>
                    <option value="ACCESSORY">配饰</option>
                    <option value="OTHER">其他</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-white/60">可见性</label>
                  <select
                    value={editForm.visibility}
                    onChange={(event) => setEditForm({ ...editForm, visibility: event.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-cyan-500/50 focus:outline-none"
                  >
                    <option value="PUBLIC">公共</option>
                    <option value="TEAM">团队</option>
                    <option value="PERSONAL">私有</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-white/60">描述</label>
                  <textarea
                    value={editForm.description}
                    onChange={(event) => setEditForm({ ...editForm, description: event.target.value })}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-cyan-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-white/60">Prompt 提示词</label>
                  <textarea
                    value={editForm.prompt}
                    onChange={(event) => setEditForm({ ...editForm, prompt: event.target.value })}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-cyan-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-white/60">标签（逗号分隔）</label>
                  <input
                    type="text"
                    value={editForm.tags}
                    onChange={(event) => setEditForm({ ...editForm, tags: event.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-cyan-500/50 focus:outline-none"
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setEditingMaterial(null)}
                  className="flex-1 rounded-xl bg-white/10 px-4 py-2.5 text-white/80 transition-colors hover:bg-white/20"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveMaterialEdit}
                  disabled={isSaving || !editForm.name.trim()}
                  className="flex-1 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 px-4 py-2.5 font-medium text-white transition-all hover:shadow-lg hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && selectedMaterial && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md" onClick={() => setShowDeleteConfirm(false)}>
          <div
            className="w-full max-w-sm overflow-hidden rounded-3xl shadow-2xl"
            style={{
              background: 'linear-gradient(180deg, rgba(20,30,35,0.98) 0%, rgba(15,20,25,0.99) 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
                <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">确认删除</h3>
              <p className="mb-6 text-sm text-white/60">确定要删除素材 “{selectedMaterial.name}” 吗？此操作无法撤销。</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 rounded-xl bg-white/10 px-4 py-2.5 text-white/80 transition-colors hover:bg-white/20"
                >
                  取消
                </button>
                <button
                  onClick={handleDeleteMaterial}
                  disabled={isSaving}
                  className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                >
                  {isSaving ? '删除中...' : '删除'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMovementDeleteConfirm && selectedMovement && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md" onClick={() => setShowMovementDeleteConfirm(false)}>
          <div
            className="w-full max-w-sm overflow-hidden rounded-3xl shadow-2xl"
            style={{
              background: 'linear-gradient(180deg, rgba(20,30,35,0.98) 0%, rgba(15,20,25,0.99) 100%)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
                <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">确认删除</h3>
              <p className="mb-6 text-sm text-white/60">确定要删除这条动作素材吗？此操作无法撤销。</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowMovementDeleteConfirm(false)}
                  className="flex-1 rounded-xl bg-white/10 px-4 py-2.5 text-white/80 transition-colors hover:bg-white/20"
                >
                  取消
                </button>
                <button
                  onClick={handleDeleteMovement}
                  disabled={isSaving}
                  className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                >
                  {isSaving ? '删除中...' : '删除'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none fixed -left-64 top-1/3 -z-10 h-[500px] w-[500px] rounded-full bg-cyan-600/10 blur-[100px]" />
      <div className="pointer-events-none fixed -right-64 bottom-1/3 -z-10 h-[400px] w-[400px] rounded-full bg-emerald-600/10 blur-[100px]" />
    </div>
  )
}
