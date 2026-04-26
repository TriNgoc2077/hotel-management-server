-- ========================================================
-- Triggers for User and Booking creation logs
-- ========================================================

DELIMITER //

DROP TRIGGER IF EXISTS trg_after_user_insert //
CREATE TRIGGER trg_after_user_insert
AFTER INSERT ON `users`
FOR EACH ROW
BEGIN
    INSERT INTO `system_logs` (id, user_id, action, description, created_at)
    VALUES (UUID(), NEW.id, 'USER_CREATED', CONCAT('New user created with email: ', NEW.email), NOW());
END //

DROP TRIGGER IF EXISTS trg_after_booking_insert //
CREATE TRIGGER trg_after_booking_insert
AFTER INSERT ON `bookings`
FOR EACH ROW
BEGIN
    INSERT INTO `system_logs` (id, user_id, action, description, created_at)
    VALUES (UUID(), NEW.customer_id, 'BOOKING_CREATED', CONCAT('New booking created with short_id: ', NEW.short_id), NOW());
END //

DELIMITER ;
