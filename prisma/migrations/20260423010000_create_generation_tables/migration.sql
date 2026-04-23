-- Migration: create_generation_tables
-- Created: 2026-04-23
-- Description: Create model_images, style_images, first_frames tables with input_hash deduplication

-- 1. Create model_images table
CREATE TABLE `model_images` (
    `id` VARCHAR(36) NOT NULL PRIMARY KEY,
    `product_id` VARCHAR(36) NOT NULL,
    `ip_id` VARCHAR(36) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `input_hash` VARCHAR(64) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_model_images_product` (`product_id`),
    INDEX `idx_model_images_ip` (`ip_id`),
    UNIQUE INDEX `uniq_model_images_dedup` (`product_id`, `ip_id`, `input_hash`)
) DEFAULT CHARACTER SET UTF8MB4 COLLATE 'UTF8MB4_unicode_ci';

-- 2. Create style_images table
CREATE TABLE `style_images` (
    `id` VARCHAR(36) NOT NULL PRIMARY KEY,
    `product_id` VARCHAR(36) NOT NULL,
    `ip_id` VARCHAR(36) NOT NULL,
    `model_image_id` VARCHAR(36) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `pose_id` VARCHAR(36) NULL,
    `makeup_id` VARCHAR(36) NULL,
    `accessory_id` VARCHAR(36) NULL,
    `input_hash` VARCHAR(64) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_style_images_product` (`product_id`),
    INDEX `idx_style_images_model_image` (`model_image_id`),
    UNIQUE INDEX `uniq_style_images_dedup` (`model_image_id`, `input_hash`)
) DEFAULT CHARACTER SET UTF8MB4 COLLATE 'UTF8MB4_unicode_ci';

-- 3. Create first_frames table
CREATE TABLE `first_frames` (
    `id` VARCHAR(36) NOT NULL PRIMARY KEY,
    `product_id` VARCHAR(36) NOT NULL,
    `ip_id` VARCHAR(36) NOT NULL,
    `style_image_id` VARCHAR(36) NULL,
    `url` VARCHAR(500) NOT NULL,
    `scene_id` VARCHAR(36) NULL,
    `composition` VARCHAR(500) NULL,
    `input_hash` VARCHAR(64) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_first_frames_product` (`product_id`),
    INDEX `idx_first_frames_style_image` (`style_image_id`),
    UNIQUE INDEX `uniq_first_frames_dedup` (`product_id`, `ip_id`, `scene_id`, `input_hash`)
) DEFAULT CHARACTER SET UTF8MB4 COLLATE 'UTF8MB4_unicode_ci';