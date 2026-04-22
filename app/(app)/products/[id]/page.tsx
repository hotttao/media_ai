import { notFound } from 'next/navigation'
import { getProductById } from '@/domains/product/service'
import { ProductDetail } from './ProductDetail'

export default async function ProductDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const product = await getProductById(params.id)

  if (!product) {
    notFound()
  }

  return <ProductDetail product={product} />
}
