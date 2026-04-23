-- Migration: add_pose_material_type
-- Created: 2026-04-23

ALTER TABLE `materials` MODIFY COLUMN `type` ENUM('SCENE', 'POSE', 'MAKEUP', 'ACCESSORY', 'OTHER') NOT NULL;
