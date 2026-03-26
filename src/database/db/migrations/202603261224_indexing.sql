CREATE INDEX `idx_rooms_status` ON `rooms` (`status`);

CREATE INDEX `idx_bookings_status` ON `bookings` (`status`);

CREATE INDEX `idx_booking_availability` ON `bookings` (`check_in_date`, `check_out_date`, `status`);

CREATE INDEX `idx_payments_status` ON `payments` (`payment_status`);
CREATE INDEX `idx_notifications_user_is_read` ON `notifications` (`user_id`, `is_read`);

CREATE INDEX `idx_system_logs_created_at` ON `system_logs` (`created_at`);
CREATE INDEX `idx_system_logs_user_created` ON `system_logs` (`user_id`, `created_at`);