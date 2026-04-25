import { db } from '@/foundation/lib/db'
import { v4 as uuid } from 'uuid'
import type { CreateProductInput, ProductFilterInput } from './types'

export async function getProductSummaryById(id: string, teamId: string) {
  return db.product.findFirst({
    where: { id, teamId },
    select: {
      id: true,
      name: true,
    },
  })
}

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
    include: {
      images: true,
      productScenes: {
        include: { material: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
}

export async function getProductScenes(productId: string) {
  return db.productScene.findMany({
    where: { productId },
    include: { material: true },
    orderBy: { createdAt: 'desc' },
  })
}

export async function setProductScenes(productId: string, materialIds: string[]) {
  return db.$transaction(async (tx) => {
    await tx.productScene.deleteMany({
      where: { productId },
    })

    if (materialIds.length > 0) {
      await tx.productScene.createMany({
        data: materialIds.map((materialId) => ({
          productId,
          materialId,
        })),
      })
    }
  })
}

export async function isSceneAllowedForProductAndIp(productId: string, ipId: string, sceneId: string) {
  const [productSceneCount, productSceneMatch, ipSceneCount, ipSceneMatch] = await Promise.all([
    db.productScene.count({ where: { productId } }),
    db.productScene.count({ where: { productId, materialId: sceneId } }),
    db.virtualIpScene.count({ where: { virtualIpId: ipId } }),
    db.virtualIpScene.count({ where: { virtualIpId: ipId, materialId: sceneId } }),
  ])

  const allowedByProduct = productSceneCount === 0 || productSceneMatch > 0
  const allowedByIp = ipSceneCount === 0 || ipSceneMatch > 0

  return allowedByProduct && allowedByIp
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
