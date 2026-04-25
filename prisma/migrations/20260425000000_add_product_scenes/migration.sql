-- Migration: add_product_scenes
-- Created: 2026-04-25

CREATE TABLE `product_scenes` (
    `id` VARCHAR(36) NOT NULL,
    `product_id` VARCHAR(36) NOT NULL,
    `material_id` VARCHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `product_scenes_product_id_material_id_key`(`product_id`, `material_id`),
    INDEX `idx_product_scenes_product`(`product_id`),
    INDEX `idx_product_scenes_material`(`material_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `product_scenes`
  ADD CONSTRAINT `product_scenes_product_id_fkey`
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `product_scenes`
  ADD CONSTRAINT `product_scenes_material_id_fkey`
  FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
