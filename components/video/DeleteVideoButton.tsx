'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface DeleteVideoButtonProps {
  videoId: string
}

export function DeleteVideoButton({ videoId }: DeleteVideoButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/videos/${videoId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        window.location.href = '/videos'
      } else {
        alert('删除失败')
      }
    } catch {
      alert('删除失败')
    } finally {
      setLoading(false)
      setConfirmOpen(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setConfirmOpen(true)}
        className="text-red-500 border-red-500/50 hover:bg-red-500/10"
      >
        删除视频
      </Button>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-900 rounded-xl p-6 max-w-sm w-full mx-4 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-2">确认删除</h3>
            <p className="text-sm text-white/60 mb-4">
              确定要删除这个视频吗？此操作不可撤销。
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setConfirmOpen(false)}
                disabled={loading}
              >
                取消
              </Button>
              <Button
                onClick={handleDelete}
                disabled={loading}
                className="bg-red-600 hover:bg-red-500"
              >
                {loading ? '删除中...' : '删除'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}