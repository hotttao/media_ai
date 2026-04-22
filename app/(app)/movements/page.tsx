'use client'

import { useState, useEffect } from 'react'
import { MovementCard } from '@/components/movement/MovementCard'
import { MovementForm } from '@/components/movement/MovementForm'

interface Movement {
  id: string
  url: string | null
  content: string
  clothing: string | null
  scope: string | null
  createdAt: string
}

const filterOptions = [
  { value: 'ALL', label: '全部' },
  { value: 'TEXT', label: '文字动作' },
  { value: 'VIDEO', label: '视频动作' },
]

export default function MovementsPage() {
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [showForm, setShowForm] = useState(false)
  const [editingMovement, setEditingMovement] = useState<Movement | null>(null)

  const fetchMovements = () => {
    fetch('/api/movements')
      .then(res => res.json())
      .then(data => {
        setMovements(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    fetchMovements()
  }, [])

  const filteredMovements = filter === 'ALL'
    ? movements
    : filter === 'TEXT'
      ? movements.filter(m => !m.url)
      : movements.filter(m => m.url)

  const handleCreate = async (data: any) => {
    const res = await fetch('/api/movements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      setShowForm(false)
      fetchMovements()
    }
  }

  const handleUpdate = async (data: any) => {
    if (!editingMovement) return
    const res = await fetch(`/api/movements/${editingMovement.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      setEditingMovement(null)
      fetchMovements()
    }
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/movements/${id}`, { method: 'DELETE' })
    fetchMovements()
  }

  const handleEdit = (movement: Movement) => {
    setEditingMovement(movement)
    setShowForm(true)
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative mb-10 overflow-hidden rounded-3xl">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-cyan-900/30 to-emerald-900/40" />
        <div className="absolute inset-0 backdrop-blur-xl" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />

        <div className="relative p-10">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">动作素材库</h1>
              <p className="text-white/60 mt-1">管理视频生成动作资产</p>
            </div>
          </div>

          <div className="flex gap-8 mt-6">
            <div>
              <span className="text-4xl font-bold text-white">{movements.length}</span>
              <span className="text-white/40 ml-2">个动作</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Add */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-black/40 rounded-2xl p-4 mb-8 border border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {filterOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  filter === opt.value
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => { setEditingMovement(null); setShowForm(true) }}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium shadow-lg hover:shadow-xl transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            创建动作
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      ) : filteredMovements.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-white/40">还没有动作素材</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMovements.map(movement => (
            <MovementCard
              key={movement.id}
              movement={movement}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onClick={() => setShowForm(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
            style={{ background: 'linear-gradient(180deg, rgba(20,30,35,0.98) 0%, rgba(15,20,25,0.99) 100%)', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                {editingMovement ? '编辑动作' : '创建动作'}
              </h2>
              <MovementForm
                movement={editingMovement || undefined}
                onSubmit={editingMovement ? handleUpdate : handleCreate}
                onCancel={() => { setShowForm(false); setEditingMovement(null) }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
