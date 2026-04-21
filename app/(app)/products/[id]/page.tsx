import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { getProductById } from '@/domains/product/service'

const audienceLabels = {
  MENS: '男装',
  WOMENS: '女装',
  KIDS: '童装',
}

export default async function ProductDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const product = await getProductById(params.id)

  if (!product) {
    notFound()
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/products" className="text-sm text-warm-silver hover:text-foreground mb-2 inline-block">
            ← 返回产品列表
          </Link>
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm px-3 py-1 bg-gray-100 rounded-full">
              {audienceLabels[product.targetAudience]}
            </span>
            {product.tags && (
              <span className="text-sm text-warm-silver">
                {JSON.parse(product.tags).join(', ')}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">编辑</Button>
          <Button variant="destructive">删除</Button>
        </div>
      </div>

      {/* Images */}
      {product.images && product.images.length > 0 && (
        <div className="bg-white rounded-card border border-border shadow-clay p-6 mb-6">
          <h2 className="font-medium mb-4">产品图片</h2>
          <div className="grid grid-cols-3 gap-4">
            {product.images.map((image) => (
              <div
                key={image.id}
                className={`relative aspect-square rounded-lg overflow-hidden ${
                  image.isMain ? 'ring-2 ring-matcha-600' : ''
                }`}
              >
                <Image
                  src={image.url}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
                {image.isMain && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-matcha-600 text-white text-xs rounded">
                    主图
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Details */}
      <div className="bg-white rounded-card border border-border shadow-clay p-6">
        <h2 className="font-medium mb-4">产品详情</h2>

        {product.productDetails && (
          <div className="mb-4">
            <h3 className="text-sm text-warm-silver mb-1">产品细节</h3>
            <p className="text-sm whitespace-pre-wrap">{product.productDetails}</p>
          </div>
        )}

        {product.displayActions && (
          <div>
            <h3 className="text-sm text-warm-silver mb-1">展示动作</h3>
            <p className="text-sm whitespace-pre-wrap">{product.displayActions}</p>
          </div>
        )}
      </div>
    </div>
  )
}