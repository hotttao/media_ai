'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
}

export function IpForm({ initialData, isEdit }: IpFormProps) {
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

      router.push('/ips')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nickname">昵称 *</Label>
              <Input
                id="nickname"
                name="nickname"
                defaultValue={initialData?.nickname}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">性别</Label>
              <Select name="gender" defaultValue={initialData?.gender || ''}>
                <SelectTrigger>
                  <SelectValue placeholder="选择性别" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">男</SelectItem>
                  <SelectItem value="FEMALE">女</SelectItem>
                  <SelectItem value="OTHER">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">年龄</Label>
              <Input
                id="age"
                name="age"
                type="number"
                min="0"
                max="150"
                defaultValue={initialData?.age}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="education">学历</Label>
              <Input
                id="education"
                name="education"
                defaultValue={initialData?.education}
                placeholder="如：本科"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="major">专业</Label>
              <Input
                id="major"
                name="major"
                defaultValue={initialData?.major}
                placeholder="如：计算机科学"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>人物特征</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="height">身高 (cm)</Label>
              <Input
                id="height"
                name="height"
                type="number"
                step="0.1"
                defaultValue={initialData?.height}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">体重 (kg)</Label>
              <Input
                id="weight"
                name="weight"
                type="number"
                step="0.1"
                defaultValue={initialData?.weight}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="personality">性格描述</Label>
            <Input
              id="personality"
              name="personality"
              defaultValue={initialData?.personality}
              placeholder="如：活泼开朗、温柔体贴"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="catchphrase">口头禅</Label>
            <Input
              id="catchphrase"
              name="catchphrase"
              defaultValue={initialData?.catchphrase}
              placeholder="如：OMG，买它！"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? '保存中...' : isEdit ? '保存修改' : '创建 IP'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          取消
        </Button>
      </div>
    </form>
  )
}