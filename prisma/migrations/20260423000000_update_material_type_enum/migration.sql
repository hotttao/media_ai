-- Migration: update_material_type_enum
-- Created: 2026-04-23
-- Description: Remove CLOTHING, ACTION, POSE from MaterialType enum

-- 1. Drop foreign key constraints first
ALTER TABLE `product_materials` DROP FOREIGN KEY `fk_product_materials_pose`;

-- 2. Update the enum column - MySQL doesn't support dropping enum values directly,
-- so we need to modify the column
ALTER TABLE `materials` MODIFY COLUMN `type` ENUM('SCENE', 'MAKEUP', 'ACCESSORY', 'OTHER') NOT NULL;

-- 3. Optionally drop the POSE index if it exists (will fail if doesn't exist, that's ok)
-- This is handled by the foreign key drop above
