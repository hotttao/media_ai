'use client'

import { useState } from 'react'
import { getImageUrl } from '@/foundation/lib/utils'

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

interface IpMaterialCardProps {
  material: IpMaterial
}

export function IpMaterialCard({ material }: IpMaterialCardProps) {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

  const typeLabels = {
    MAKEUP: '妆容',
    ACCESSORY: '装饰',
    CUSTOMIZED_CLOTHING: '定制服装',
  }

  return (
    <>
      <div
        className="group rounded-2xl overflow-hidden backdrop-blur-xl transition-all hover:scale-[1.02]"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Image */}
        <div
          className="relative aspect-[9/16] max-h-60 cursor-pointer overflow-hidden bg-black/20"
          onClick={() => {
            const img = material.threeViewUrl || material.fullBodyUrl || material.nineViewUrl
            if (img) setLightboxImage(img)
          }}
        >
          {(material.threeViewUrl || material.fullBodyUrl || material.nineViewUrl) ? (
            <img
              src={getImageUrl(material.threeViewUrl || material.fullBodyUrl || material.nineViewUrl || '')}
              alt={material.name}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-white/5">
              <span className="text-white/20 text-4xl">?</span>
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white text-sm">点击查看大图</span>
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-medium text-white truncate">{material.name}</h4>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: material.type === 'MAKEUP'
                  ? 'rgba(236, 72, 153, 0.2)'
                  : material.type === 'ACCESSORY'
                  ? 'rgba(139, 92, 246, 0.2)'
                  : 'rgba(34, 211, 238, 0.2)',
                color: material.type === 'MAKEUP'
                  ? 'rgba(236, 72, 153, 1)'
                  : material.type === 'ACCESSORY'
                  ? 'rgba(139, 92, 246, 1)'
                  : 'rgba(34, 211, 238, 1)',
              }}
            >
              {typeLabels[material.type]}
            </span>
          </div>

          {/* Thumbnail row */}
          <div className="flex gap-1 mt-2">
            {material.fullBodyUrl && (
              <div
                className="w-8 aspect-[9/16] rounded overflow-hidden bg-black/20 cursor-pointer hover:ring-2 hover:ring-purple-500/50"
                onClick={(e) => {
                  e.stopPropagation()
                  setLightboxImage(material.fullBodyUrl)
                }}
              >
                <img src={getImageUrl(material.fullBodyUrl)} alt="全身" className="w-full h-full object-contain" />
              </div>
            )}
            {material.threeViewUrl && (
              <div
                className="w-8 aspect-[9/16] rounded overflow-hidden bg-black/20 cursor-pointer hover:ring-2 hover:ring-purple-500/50"
                onClick={(e) => {
                  e.stopPropagation()
                  setLightboxImage(material.threeViewUrl)
                }}
              >
                <img src={getImageUrl(material.threeViewUrl)} alt="三视图" className="w-full h-full object-contain" />
              </div>
            )}
            {material.nineViewUrl && (
              <div
                className="w-8 aspect-[9/16] rounded overflow-hidden bg-black/20 cursor-pointer hover:ring-2 hover:ring-purple-500/50"
                onClick={(e) => {
                  e.stopPropagation()
                  setLightboxImage(material.nineViewUrl)
                }}
              >
                <img src={getImageUrl(material.nineViewUrl)} alt="九视图" className="w-full h-full object-contain" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              className="absolute -top-10 right-0 text-white/60 hover:text-white text-2xl"
              onClick={() => setLightboxImage(null)}
            >
              ✕
            </button>
            <img
              src={getImageUrl(lightboxImage)}
              alt=""
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  )
}
