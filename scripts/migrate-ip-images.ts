/**
 * Migration script: Move fullBodyUrl, threeViewUrl, nineViewUrl from ip_images to virtual_ips
 *
 * Run with: npx tsx scripts/migrate-ip-images.ts
 */
import { db } from '@/foundation/lib/db'

async function migrate() {
  console.log('Starting migration of IP images from ip_images to virtual_ips...')

  // Find all ip_images records with actual image URLs
  const ipImages = await db.ipImage.findMany({
    where: {
      OR: [
        { fullBodyUrl: { not: null } },
        { threeViewUrl: { not: null } },
        { nineViewUrl: { not: null } },
      ],
    },
  })

  console.log(`Found ${ipImages.length} ip_images records to migrate`)

  let migrated = 0
  let skipped = 0

  for (const img of ipImages) {
    const existingIp = await db.virtualIp.findUnique({
      where: { id: img.ipId },
    })

    if (!existingIp) {
      console.log(`⚠️  VirtualIp not found for ipId: ${img.ipId}, skipping`)
      skipped++
      continue
    }

    // Build update data - only update if virtual_ips field is currently null
    const updateData: {
      fullBodyUrl?: string | null
      threeViewUrl?: string | null
      nineViewUrl?: string | null
    } = {}

    if (!existingIp.fullBodyUrl && img.fullBodyUrl) {
      updateData.fullBodyUrl = img.fullBodyUrl
    }
    if (!existingIp.threeViewUrl && img.threeViewUrl) {
      updateData.threeViewUrl = img.threeViewUrl
    }
    if (!existingIp.nineViewUrl && img.nineViewUrl) {
      updateData.nineViewUrl = img.nineViewUrl
    }

    if (Object.keys(updateData).length > 0) {
      await db.virtualIp.update({
        where: { id: img.ipId },
        data: updateData,
      })
      console.log(`✅ Migrated images for VirtualIp: ${img.ipId} (${existingIp.nickname})`)
      migrated++
    } else {
      console.log(`⏭️  Skipped VirtualIp: ${img.ipId} (already has images or no new images)`)
      skipped++
    }
  }

  console.log(`\nMigration complete: ${migrated} migrated, ${skipped} skipped`)

  // Verify the data
  console.log('\n--- Verification ---')
  const vipsWithImages = await db.virtualIp.findMany({
    where: {
      OR: [
        { fullBodyUrl: { not: null } },
        { threeViewUrl: { not: null } },
        { nineViewUrl: { not: null } },
      ],
    },
    select: {
      id: true,
      nickname: true,
      fullBodyUrl: true,
      threeViewUrl: true,
      nineViewUrl: true,
    },
  })

  console.log(`VirtualIps with images in virtual_ips table: ${vipsWithImages.length}`)
  for (const vip of vipsWithImages) {
    console.log(`  - ${vip.nickname}: fullBody=${!!vip.fullBodyUrl}, threeView=${!!vip.threeViewUrl}, nineView=${!!vip.nineViewUrl}`)
  }

  await db.$disconnect()
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
