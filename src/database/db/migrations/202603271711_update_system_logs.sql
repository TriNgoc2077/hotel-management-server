ALTER TABLE `system_logs` ADD COLUMN `ip` varchar(50) AFTER `action`, ADD COLUMN `user_agent` text AFTER `ip`;
