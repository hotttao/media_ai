'use client'

import { useState } from 'react'

interface MovementCardProps {
  movement: {
    id: string
    url: string | null
    content: string
    clothing: string | null
    scope: string | null
    createdAt: string
  }
  onEdit: (movement: any) => void
  onDelete: (id: string) => void
}

export function MovementCard({ movement, onEdit, onDelete }: MovementCardProps) {
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-white/10 group hover:border-cyan-500/30 transition-all duration-300">
      {/* Video indicator or text indicator */}
      <div className="aspect-video bg-gradient-to-br from-blue-900/40 to-cyan-900/40 flex items-center justify-center">
        {movement.url ? (
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="text-xs text-cyan-400/60 mt-2">视频动作</span>
          </div>
        ) : (
          <div className="text-center px-4">
            <p className="text-sm text-white/60 line-clamp-3">{movement.content}</p>
            <span className="text-xs text-blue-400/60 mt-2">文字动作</span>
          </div>
        )}
      </div>

      {/* Info section */}
      <div className="p-4">
        <p className="text-sm text-white/80 line-clamp-2 mb-2">{movement.content}</p>
        {movement.clothing && (
          <p className="text-xs text-white/40">服装: {movement.clothing}</p>
        )}
        {movement.scope && (
          <p className="text-xs text-white/40">适用: {movement.scope}</p>
        )}
      </div>

      {/* Actions */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(movement)}
          className="p-2 rounded-lg bg-black/50 text-white/60 hover:text-white hover:bg-black/70"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={() => setShowConfirm(true)}
          className="p-2 rounded-lg bg-black/50 text-red-400/60 hover:text-red-400 hover:bg-black/70"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Delete confirmation */}
      {showConfirm && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-2xl" onClick={() => setShowConfirm(false)}>
          <div className="text-center p-4" onClick={e => e.stopPropagation()}>
            <p className="text-white mb-4">确认删除？</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 rounded-lg bg-white/10 text-white/60">取消</button>
              <button onClick={() => { onDelete(movement.id); setShowConfirm(false) }} className="px-4 py-2 rounded-lg bg-red-600 text-white">删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
