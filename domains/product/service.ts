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
    include: { images: true },
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
  return db.$transaction(async (tx) => {
    const product = await tx.product.findFirst({
      where: { id, userId, teamId },
      select: { id: true },
    })

    if (!product) {
      return { count: 0 }
    }

    await tx.firstFrame.deleteMany({ where: { productId: id } })
    await tx.styleImage.deleteMany({ where: { productId: id } })
    await tx.modelImage.deleteMany({ where: { productId: id } })
    await tx.video.updateMany({
      where: { productId: id },
      data: { productId: null },
    })

    await tx.product.delete({ where: { id } })

    return { count: 1 }
  })
}

export async function addProductImage(productId: string, url: string) {
  return db.productImage.create({
    data: {
      id: uuid(),
      productId,
      url,
      isMain: false,
      order: 0,
    },
  })
}

export async function deleteProductImage(imageId: string) {
  return db.productImage.delete({
    where: { id: imageId },
  })
}
