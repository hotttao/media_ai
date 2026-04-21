import { db } from '@/foundation/lib/db'
import { v4 as uuid } from 'uuid'
import type { CreateProductInput, ProductFilterInput } from './types'

export async function createProduct(
  userId: string,
  teamId: string,
  input: CreateProductInput
) {
  const images = input.images || []

  return db.product.create({
    data: {
      id: uuid(),
      userId,
      teamId,
      name: input.name,
      targetAudience: input.targetAudience,
      productDetails: input.productDetails,
      displayActions: input.displayActions,
      tags: input.tags ? JSON.stringify(input.tags) : null,
      images: {
        create: images.map((img, idx) => ({
          id: uuid(),
          url: img.url,
          isMain: img.isMain,
          order: img.order ?? idx,
        })),
      },
    },
    include: { images: true },
  })
}

export async function getProducts(
  teamId: string,
  userId: string,
  filters?: ProductFilterInput
) {
  const where: any = {
    OR: [
      { teamId },
    ],
  }

  if (filters?.targetAudience) {
    where.targetAudience = filters.targetAudience
  }

  if (filters?.search) {
    where.name = { contains: filters.search }
  }

  if (filters?.tags && filters.tags.length > 0) {
    where.tags = {
      OR: filters.tags.map(tag => ({
        contains: tag,
      })),
    }
  }

  return db.product.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { images: true },
  })
}

export async function getProductById(id: string) {
  return db.product.findUnique({
    where: { id },
    include: { images: { orderBy: { order: 'asc' } } },
  })
}

export async function updateProduct(
  id: string,
  userId: string,
  teamId: string,
  input: Partial<CreateProductInput>
) {
  const { images, ...rest } = input

  await db.productImage.deleteMany({ where: { productId: id } })

  return db.product.update({
    where: { id },
    data: {
      ...rest,
      tags: rest.tags ? JSON.stringify(rest.tags) : undefined,
      images: images ? {
        create: images.map((img, idx) => ({
          id: uuid(),
          url: img.url,
          isMain: img.isMain,
          order: img.order ?? idx,
        })),
      } : undefined,
    },
    include: { images: true },
  })
}

export async function deleteProduct(id: string, userId: string, teamId: string) {
  return db.product.deleteMany({
    where: {
      id,
      userId,
      teamId,
    },
  })
}