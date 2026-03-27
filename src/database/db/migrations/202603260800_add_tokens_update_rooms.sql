CREATE TABLE `tokens` (
  `id` char(36) PRIMARY KEY,
  `user_id` char(36),
  `fcm_token` varchar(255),
  `refresh_token` varchar(512),
  `agent` varchar(255),
  `expired_at` timestamp NULL,
  CONSTRAINT `fk_tokens_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

ALTER TABLE `rooms` 
  ADD COLUMN `name` varchar(50) AFTER `room_number`,
  ADD COLUMN `description` text AFTER `name`,
  ADD COLUMN `images` json AFTER `description`,
  ADD COLUMN `is_public` boolean DEFAULT true AFTER `images`;

ALTER TABLE `users` DROP COLUMN `refresh_token`;