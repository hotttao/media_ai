-- Add prompt to core materials
ALTER TABLE `materials`
  ADD COLUMN `prompt` TEXT NULL AFTER `description`;

-- Add general/special semantics to movement materials
ALTER TABLE `movement_materials`
  ADD COLUMN `is_general` BOOLEAN NOT NULL DEFAULT true AFTER `scope`;

-- Add pose to movement mapping table
CREATE TABLE `pose_movements` (
  `id` VARCHAR(36) NOT NULL,
  `pose_id` VARCHAR(191) NOT NULL,
  `movement_id` VARCHAR(36) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `pose_movements_pose_id_movement_id_key`(`pose_id`, `movement_id`),
  INDEX `idx_pose_movements_pose`(`pose_id`),
  INDEX `idx_pose_movements_movement`(`movement_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `pose_movements`
  ADD CONSTRAINT `pose_movements_pose_id_fkey`
  FOREIGN KEY (`pose_id`) REFERENCES `materials`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `pose_movements`
  ADD CONSTRAINT `pose_movements_movement_id_fkey`
  FOREIGN KEY (`movement_id`) REFERENCES `movement_materials`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Add generation trace IDs to videos
ALTER TABLE `videos`
  ADD COLUMN `prompt` TEXT NULL AFTER `thumbnail`,
  ADD COLUMN `scene_id` VARCHAR(36) NULL AFTER `product_id`,
  ADD COLUMN `pose_id` VARCHAR(36) NULL AFTER `scene_id`,
  ADD COLUMN `movement_id` VARCHAR(36) NULL AFTER `pose_id`,
  ADD COLUMN `first_frame_id` VARCHAR(36) NULL AFTER `movement_id`,
  ADD COLUMN `style_image_id` VARCHAR(36) NULL AFTER `first_frame_id`,
  ADD COLUMN `model_image_id` VARCHAR(36) NULL AFTER `style_image_id`;

CREATE INDEX `videos_scene_id_idx` ON `videos`(`scene_id`);
CREATE INDEX `videos_pose_id_idx` ON `videos`(`pose_id`);
CREATE INDEX `videos_movement_id_idx` ON `videos`(`movement_id`);
CREATE INDEX `videos_first_frame_id_idx` ON `videos`(`first_frame_id`);
CREATE INDEX `videos_style_image_id_idx` ON `videos`(`style_image_id`);
CREATE INDEX `videos_model_image_id_idx` ON `videos`(`model_image_id`);
