-- use coupon
DROP PROCEDURE IF EXISTS sp_use_coupon;
DELIMITER //
CREATE PROCEDURE sp_use_coupon(
    IN p_booking_id VARCHAR(36),
    IN p_coupon_code VARCHAR(50),
    IN p_discount_amount DECIMAL(10, 2)
)
BEGIN
    UPDATE bookings SET discount = discount + p_discount_amount WHERE id = p_booking_id;
    UPDATE coupons SET coupon_status = 'Inactive' WHERE code = p_coupon_code;
END //
DELIMITER ;