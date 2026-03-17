-- drop table - do not run this script
-- SET FOREIGN_KEY_CHECKS = 0;
-- DROP TABLE IF EXISTS `system_logs`, `notifications`, `invoices`, `payments`, `booking_services`, `services`, `booking_rooms`, `bookings`, `rooms`, `room_types`, `users`, `roles`;
-- SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `roles` (
  `id` char(36) PRIMARY KEY,
  `name` varchar(50) COMMENT 'Admin, Staff, Customer'
);

CREATE TABLE `users` (
  `id` char(36) PRIMARY KEY,
  `role_id` char(36),
  `full_name` varchar(100),
  `email` varchar(100) UNIQUE,
  `password_hash` varchar(255),
  `refresh_token` text COMMENT 'Lưu hashed refresh token để bảo mật',
  `phone` varchar(20),
  `address` text,
  `status` varchar(20) COMMENT 'Active, Locked',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE `room_types` (
  `id` char(36) PRIMARY KEY,
  `name` varchar(50) COMMENT 'Standard, Deluxe, Suite',
  `description` text,
  `base_price` decimal(10,2),
  `capacity` int
);

CREATE TABLE `rooms` (
  `id` char(36) PRIMARY KEY,
  `room_number` varchar(10) UNIQUE,
  `room_type_id` char(36),
  `status` varchar(20) COMMENT 'Vacant, Reserved, Occupied, Out_of_Order',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `bookings` (
  `id` char(36) PRIMARY KEY,
  `short_id` varchar(20) UNIQUE COMMENT 'Shorter for transfer (EX: BK12345)',
  `customer_id` char(36),
  `staff_id` char(36),
  `check_in_date` date,
  `check_out_date` date,
  `actual_check_in` datetime,
  `actual_check_out` datetime,
  `total_room_price` decimal(10,2),
  `total_service_price` decimal(10,2),
  `grand_total` decimal(10,2),
  `status` varchar(20) COMMENT 'Pending, Confirmed, Checked-in, Checked-out, Cancelled',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE `booking_rooms` (
  `id` char(36) PRIMARY KEY,
  `booking_id` char(36),
  `room_id` char(36),
  `price_per_night` decimal(10,2)
);

CREATE TABLE `services` (
  `id` char(36) PRIMARY KEY,
  `name` varchar(100) COMMENT 'F&B, Laundry, Spa, Transportation...',
  `description` text,
  `price` decimal(10,2),
  `status` varchar(20) COMMENT 'Active, Inactive'
);

CREATE TABLE `booking_services` (
  `id` char(36) PRIMARY KEY,
  `booking_id` char(36),
  `service_id` char(36),
  `quantity` int,
  `price` decimal(10,2),
  `used_at` timestamp
);

CREATE TABLE `payments` (
  `id` char(36) PRIMARY KEY,
  `booking_id` char(36),
  `amount` decimal(10,2),
  `payment_method` varchar(50) COMMENT 'Cash, Credit Card, Bank Transfer',
  `payment_status` varchar(20) COMMENT 'Pending, Completed, Failed',
  `transaction_id` varchar(100) UNIQUE COMMENT 'Ma giao dich tu SePay',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `invoices` (
  `id` char(36) PRIMARY KEY,
  `booking_id` char(36),
  `invoice_number` varchar(50) UNIQUE,
  `total_amount` decimal(10,2),
  `issued_date` timestamp DEFAULT CURRENT_TIMESTAMP,
  `issued_by` char(36)
);

CREATE TABLE `notifications` (
  `id` char(36) PRIMARY KEY,
  `user_id` char(36),
  `title` varchar(255),
  `message` text,
  `is_read` boolean DEFAULT false,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `system_logs` (
  `id` char(36) PRIMARY KEY,
  `user_id` char(36),
  `action` varchar(255),
  `description` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE `users` ADD FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`);
ALTER TABLE `rooms` ADD FOREIGN KEY (`room_type_id`) REFERENCES `room_types` (`id`);
ALTER TABLE `bookings` ADD FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`);
ALTER TABLE `bookings` ADD FOREIGN KEY (`staff_id`) REFERENCES `users` (`id`);
ALTER TABLE `booking_rooms` ADD FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`);
ALTER TABLE `booking_rooms` ADD FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`);
ALTER TABLE `booking_services` ADD FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`);
ALTER TABLE `booking_services` ADD FOREIGN KEY (`service_id`) REFERENCES `services` (`id`);
ALTER TABLE `payments` ADD FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`);
ALTER TABLE `invoices` ADD FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`);
ALTER TABLE `invoices` ADD FOREIGN KEY (`issued_by`) REFERENCES `users` (`id`);
ALTER TABLE `notifications` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
ALTER TABLE `system_logs` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);