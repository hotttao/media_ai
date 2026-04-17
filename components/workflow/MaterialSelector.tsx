// components/workflow/MaterialSelector.tsx
'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MaterialCard } from '@/components/material/MaterialCard'

interface MaterialSelectorProps {
  label: string
  materialType: string
  value: string | null
  onChange: (url: string | null) => void
}

export function MaterialSelector({ label, materialType, value, onChange }: MaterialSelectorProps) {
  const [materials, setMaterials] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/materials?type=${materialType}`)
      .then(res => res.json())
      .then(data => {
        setMaterials(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [materialType])

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {loading ? (
        <p className="text-sm text-warm-silver">加载中...</p>
      ) : materials.length === 0 ? (
        <p className="text-sm text-warm-silver">无可用素材</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {materials.map(m => (
            <div
              key={m.id}
              onClick={() => onChange(m.url)}
              className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-colors ${
                value === m.url ? 'border-matcha-600' : 'border-transparent'
              }`}
            >
              <img src={m.url} alt={m.name} className="w-full aspect-square object-cover" />
            </div>
          ))}
        </div>
      )}

      {value && (
        <div className="mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
          >
            清除选择
          </Button>
        </div>
      )}
    </div>
  )
}

import { Button } from '@/components/ui/button'
