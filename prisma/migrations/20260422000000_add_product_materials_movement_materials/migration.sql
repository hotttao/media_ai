-- Migration: add_product_materials_movement_materials
-- Created: 2026-04-22

-- 1. Add POSE to MaterialType enum
ALTER TABLE `materials` MODIFY COLUMN `type` ENUM('CLOTHING', 'SCENE', 'ACTION', 'MAKEUP', 'ACCESSORY', 'OTHER', 'POSE') NOT NULL;

-- 2. Add productId column to videos table
ALTER TABLE `videos` ADD COLUMN `product_id` VARCHAR(36) NULL;
ALTER TABLE `videos` ADD CONSTRAINT `fk_videos_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL;

-- 3. Create product_materials table
CREATE TABLE `product_materials` (
    `id` VARCHAR(36) NOT NULL PRIMARY KEY,
    `product_id` VARCHAR(36) NOT NULL,
    `ip_id` VARCHAR(36) NULL,
    `scene_id` VARCHAR(36) NULL,
    `pose_id` VARCHAR(36) NULL,
    `full_body_url` VARCHAR(500) NULL,
    `three_view_url` VARCHAR(500) NULL,
    `nine_view_url` VARCHAR(500) NULL,
    `first_frame_url` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `fk_product_materials_product` (`product_id`),
    INDEX `fk_product_materials_ip` (`ip_id`),
    INDEX `fk_product_materials_scene` (`scene_id`),
    INDEX `fk_product_materials_pose` (`pose_id`),

    CONSTRAINT `fk_product_materials_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_product_materials_ip` FOREIGN KEY (`ip_id`) REFERENCES `virtual_ips`(`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_product_materials_scene` FOREIGN KEY (`scene_id`) REFERENCES `materials`(`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_product_materials_pose` FOREIGN KEY (`pose_id`) REFERENCES `materials`(`id`) ON DELETE SET NULL
) DEFAULT CHARACTER SET UTF8MB4 COLLATE 'UTF8MB4_unicode_ci';

-- 4. Create movement_materials table
CREATE TABLE `movement_materials` (
    `id` VARCHAR(36) NOT NULL PRIMARY KEY,
    `url` VARCHAR(500) NULL,
    `content` TEXT NOT NULL,
    `clothing` TEXT NULL,
    `scope` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) DEFAULT CHARACTER SET UTF8MB4 COLLATE 'UTF8MB4_unicode_ci';
