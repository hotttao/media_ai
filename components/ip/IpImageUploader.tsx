'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface IpImageUploaderProps {
  ipId: string
  onUploadComplete?: () => void
}

export function IpImageUploader({ ipId, onUploadComplete }: IpImageUploaderProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [previews, setPreviews] = useState<Record<string, string>>({})

  async function handleFileChange(fieldName: string, file: File | null) {
    if (!file) return

    const url = URL.createObjectURL(file)
    setPreviews(prev => ({ ...prev, [fieldName]: url }))
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)

    try {
      const response = await fetch(`/api/ips/${ipId}/images`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      onUploadComplete?.()
    } catch (error) {
      console.error('Upload error:', error)
      alert('上传失败')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>头像</Label>
          <input
            type="file"
            name="avatar"
            accept="image/*"
            onChange={(e) => handleFileChange('avatar', e.target.files?.[0] || null)}
            className="w-full"
          />
          {previews.avatar && (
            <img src={previews.avatar} alt="avatar preview" className="w-20 h-20 object-cover rounded" />
          )}
        </div>

        <div className="space-y-2">
          <Label>全身图</Label>
          <input
            type="file"
            name="fullBody"
            accept="image/*"
            onChange={(e) => handleFileChange('fullBody', e.target.files?.[0] || null)}
            className="w-full"
          />
          {previews.fullBody && (
            <img src={previews.fullBody} alt="fullBody preview" className="w-20 h-20 object-cover rounded" />
          )}
        </div>

        <div className="space-y-2">
          <Label>三视图</Label>
          <input
            type="file"
            name="threeView"
            accept="image/*"
            onChange={(e) => handleFileChange('threeView', e.target.files?.[0] || null)}
            className="w-full"
          />
          {previews.threeView && (
            <img src={previews.threeView} alt="threeView preview" className="w-20 h-20 object-cover rounded" />
          )}
        </div>

        <div className="space-y-2">
          <Label>九视图</Label>
          <input
            type="file"
            name="nineView"
            accept="image/*"
            onChange={(e) => handleFileChange('nineView', e.target.files?.[0] || null)}
            className="w-full"
          />
          {previews.nineView && (
            <img src={previews.nineView} alt="nineView preview" className="w-20 h-20 object-cover rounded" />
          )}
        </div>
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? '上传中...' : '上传图片'}
      </Button>
    </form>
  )
}