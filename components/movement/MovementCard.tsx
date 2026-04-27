'use client'

import { useState } from 'react'

interface MovementCardProps {
  movement: {
    id: string
    url: string | null
    content: string
    clothing: string | null
    scope: string | null
    isGeneral: boolean
    poseIds: string[]
    createdAt: string
  }
  onClick?: () => void
  onEdit: (movement: MovementCardProps['movement']) => void
  onDelete: (id: string) => void
}

export function MovementCard({ movement, onClick, onEdit, onDelete }: MovementCardProps) {
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-slate-800/80 to-slate-900/80 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-500/30"
    >
      <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-blue-900/40 to-cyan-900/40">
        {movement.url ? (
          <div className="text-center">
            <svg className="mx-auto h-9 w-9 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="mt-1.5 block text-[11px] text-cyan-300/70">视频动作</span>
          </div>
        ) : (
          <div className="px-4 text-center">
            <p className="line-clamp-3 text-sm text-white/60">{movement.content}</p>
            <span className="mt-1.5 block text-[11px] text-blue-300/70">文字动作</span>
          </div>
        )}
      </div>

      <div className="space-y-1.5 p-3">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] ${
              movement.isGeneral
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-amber-500/20 text-amber-300'
            }`}
          >
            {movement.isGeneral ? '通用动作' : '专用动作'}
          </span>
        </div>

        <p className="line-clamp-2 text-sm text-white/80">{movement.content}</p>

        {movement.clothing && (
          <p className="text-[11px] text-white/40">服装: {movement.clothing}</p>
        )}
        {movement.scope && (
          <p className="text-[11px] text-white/40">适用: {movement.scope}</p>
        )}
      </div>

      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={(event) => {
            event.stopPropagation()
            onEdit(movement)
          }}
          className="rounded-lg bg-black/50 p-1.5 text-white/60 hover:bg-black/70 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation()
            setShowConfirm(true)
          }}
          className="rounded-lg bg-black/50 p-1.5 text-red-400/70 hover:bg-black/70 hover:text-red-400"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {showConfirm && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/80"
          onClick={() => setShowConfirm(false)}
        >
          <div className="p-4 text-center" onClick={(event) => event.stopPropagation()}>
            <p className="mb-4 text-white">确认删除？</p>
            <div className="flex justify-center gap-2">
              <button onClick={() => setShowConfirm(false)} className="rounded-lg bg-white/10 px-4 py-2 text-white/70">
                取消
              </button>
              <button
                onClick={() => {
                  onDelete(movement.id)
                  setShowConfirm(false)
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-white"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
