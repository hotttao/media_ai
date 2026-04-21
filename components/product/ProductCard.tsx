'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { Product } from '@/domains/product/types'

interface ProductCardProps {
  product: Product
}

const audienceLabels = {
  MENS: '男装',
  WOMENS: '女装',
  KIDS: '童装',
}

export function ProductCard({ product }: ProductCardProps) {
  const mainImage = product.images?.find(img => img.isMain) || product.images?.[0]

  return (
    <Link href={`/products/${product.id}`}>
      <div className="bg-white rounded-card border border-border shadow-clay overflow-hidden hover:border-matcha-600 transition-colors cursor-pointer">
        {/* Image */}
        <div className="aspect-square relative bg-gray-100">
          {mainImage ? (
            <Image
              src={mainImage.url}
              alt={product.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center text-gray-400">
              <span className="text-4xl">👕</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-medium text-sm truncate">{product.name}</h3>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
              {audienceLabels[product.targetAudience]}
            </span>
          </div>
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {product.tags.slice(0, 2).map((tag, idx) => (
                <span key={idx} className="text-xs text-gray-500">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}