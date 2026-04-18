'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface IpFormProps {
  initialData?: {
    id?: string
    nickname?: string
    gender?: string
    age?: number
    height?: number
    weight?: number
    education?: string
    major?: string
    personality?: string
    catchphrase?: string
  }
  isEdit?: boolean
  onCancel?: () => void
  onSuccess?: () => void
}

export function IpForm({ initialData, isEdit, onCancel, onSuccess }: IpFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    const data = {
      nickname: formData.get('nickname'),
      gender: formData.get('gender') || undefined,
      age: formData.get('age') ? Number(formData.get('age')) : undefined,
      height: formData.get('height') ? Number(formData.get('height')) : undefined,
      weight: formData.get('weight') ? Number(formData.get('weight')) : undefined,
      education: formData.get('education') || undefined,
      major: formData.get('major') || undefined,
      personality: formData.get('personality') || undefined,
      catchphrase: formData.get('catchphrase') || undefined,
    }

    try {
      const url = isEdit && initialData?.id ? `/api/ips/${initialData.id}` : '/api/ips'
      const method = isEdit ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save IP')
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/ips')
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const inputStyles = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'white',
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && (
        <div
          className="p-3 text-sm rounded-xl"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#fca5a5',
          }}
        >
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-white/60">基本信息</h4>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="nickname" className="text-white/80 text-sm">昵称 *</Label>
            <Input
              id="nickname"
              name="nickname"
              defaultValue={initialData?.nickname}
              required
              className="rounded-xl"
              style={inputStyles}
              placeholder="输入昵称"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="gender" className="text-white/80 text-sm">性别</Label>
              <Select name="gender" defaultValue={initialData?.gender || ''}>
                <SelectTrigger className="rounded-xl" style={inputStyles}>
                  <SelectValue placeholder="选择" className="text-white/60" />
                </SelectTrigger>
                <SelectContent style={{ background: 'rgba(30,30,30,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <SelectItem value="MALE" className="text-white focus:bg-white/10">男</SelectItem>
                  <SelectItem value="FEMALE" className="text-white focus:bg-white/10">女</SelectItem>
                  <SelectItem value="OTHER" className="text-white focus:bg-white/10">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="age" className="text-white/80 text-sm">年龄</Label>
              <Input
                id="age"
                name="age"
                type="number"
                min="0"
                max="150"
                defaultValue={initialData?.age}
                className="rounded-xl"
                style={inputStyles}
                placeholder="18"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="education" className="text-white/80 text-sm">学历</Label>
              <Input
                id="education"
                name="education"
                defaultValue={initialData?.education}
                className="rounded-xl"
                style={inputStyles}
                placeholder="本科"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="major" className="text-white/80 text-sm">专业</Label>
              <Input
                id="major"
                name="major"
                defaultValue={initialData?.major}
                className="rounded-xl"
                style={inputStyles}
                placeholder="计算机"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Physical Stats */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <h4 className="text-sm font-medium text-white/60">身体数据</h4>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="height" className="text-white/80 text-sm">身高 (cm)</Label>
            <Input
              id="height"
              name="height"
              type="number"
              step="0.1"
              defaultValue={initialData?.height}
              className="rounded-xl"
              style={inputStyles}
              placeholder="170"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="weight" className="text-white/80 text-sm">体重 (kg)</Label>
            <Input
              id="weight"
              name="weight"
              type="number"
              step="0.1"
              defaultValue={initialData?.weight}
              className="rounded-xl"
              style={inputStyles}
              placeholder="55"
            />
          </div>
        </div>
      </div>

      {/* Personality */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <h4 className="text-sm font-medium text-white/60">人物特征</h4>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="personality" className="text-white/80 text-sm">性格描述</Label>
            <Input
              id="personality"
              name="personality"
              defaultValue={initialData?.personality}
              className="rounded-xl"
              style={inputStyles}
              placeholder="活泼开朗、温柔体贴"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="catchphrase" className="text-white/80 text-sm">口头禅</Label>
            <Input
              id="catchphrase"
              name="catchphrase"
              defaultValue={initialData?.catchphrase}
              className="rounded-xl"
              style={inputStyles}
              placeholder="OMG，买它！"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-matcha-600 to-matcha-500 text-white font-medium shadow-lg shadow-matcha-500/30 hover:shadow-xl transition-all disabled:opacity-50"
        >
          {isLoading ? '保存中...' : isEdit ? '保存修改' : '创建 IP'}
        </button>
        <button
          type="button"
          onClick={onCancel || (() => router.back())}
          className="px-5 py-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all border border-white/10"
        >
          取消
        </button>
      </div>
    </form>
  )
}
