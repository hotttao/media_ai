-- Add generationPath column to first_frames table
ALTER TABLE `first_frames` ADD COLUMN `generation_path` VARCHAR(20) NOT NULL DEFAULT 'gpt' AFTER `input_hash`;

-- Drop the old unique constraint
ALTER TABLE `first_frames` DROP INDEX `uniq_first_frames_dedup`;

-- Add new unique constraint with generationPath
ALTER TABLE `first_frames` ADD CONSTRAINT `uniq_first_frames_dedup` UNIQUE (`style_image_id`, `scene_id`, `composition`, `generation_path`);