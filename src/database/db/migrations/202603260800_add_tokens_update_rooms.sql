CREATE TABLE `tokens` (
  `id` char(36) PRIMARY KEY,
  `user_id` char(36),
  `fcm_token` varchar(255),
  `refresh_token` varchar(512) COMMENT 'Nên để length lớn vì refresh token có thể khá dài',
  `agent` varchar(255) COMMENT 'Lưu thông tin thiết bị/trình duyệt',
  `expired_at` timestamp NULL,
  CONSTRAINT `fk_tokens_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

ALTER TABLE `rooms` 
  ADD COLUMN `name` varchar(50) AFTER `room_number`,
  ADD COLUMN `description` text AFTER `name`,
  ADD COLUMN `images` json COMMENT 'Lưu mảng string dưới dạng JSON format: ["url1", "url2"]' AFTER `description`,
  ADD COLUMN `is_public` boolean DEFAULT true AFTER `images`;

ALTER TABLE `users` DROP COLUMN `refresh_token`;