import { ProductForm } from '@/components/product/ProductForm'

export default function NewProductPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">添加产品</h1>
        <p className="text-sm text-warm-silver mt-1">上传产品图片并填写产品信息</p>
      </div>

      <div className="bg-white rounded-card border border-border shadow-clay p-6">
        <ProductForm />
      </div>
    </div>
  )
}