-- ========================================================
-- move price_per_night from booking_rooms to room_types
-- ========================================================

ALTER TABLE `room_types` ADD COLUMN `price_per_night` decimal(10,2);
ALTER TABLE `booking_rooms` DROP COLUMN `price_per_night`;

-- ========================================================
-- add room_type_id to bookings
-- ========================================================

ALTER TABLE `bookings` ADD COLUMN `room_type_id` char(36);
ALTER TABLE `bookings` ADD FOREIGN KEY (`room_type_id`) REFERENCES `room_types` (`id`);

-- ========================================================
-- alter dates to datetime for accurate hour calculation
-- ========================================================

ALTER TABLE `bookings` MODIFY `check_in_date` DATETIME;
ALTER TABLE `bookings` MODIFY `check_out_date` DATETIME;

-- ========================================================
-- add available room types proc
-- ========================================================

DELIMITER //

DROP PROCEDURE IF EXISTS sp_find_available_room_types //
CREATE PROCEDURE sp_find_available_room_types(
    IN p_type_id char(36),
    IN p_check_in DATETIME,
    IN p_check_out DATETIME
)
BEGIN
    SELECT * FROM v_rooms r
    WHERE r.room_type_id = p_type_id 
      AND r.status != 'Out_of_Order'
      AND r.id NOT IN (
          SELECT br.room_id 
          FROM booking_rooms br
          JOIN bookings b ON br.booking_id = b.id
          WHERE b.status IN ('Confirmed', 'Checked-in', 'Pending') 
            AND b.check_in_date < p_check_out 
            AND b.check_out_date > p_check_in
            AND b.id IS NOT NULL 
      );
END //

-- ========================================================
-- sp_create_booking
-- we have 5 steps:
-- 1. Check dates
-- 2. Lock & Validate rooms
-- 3. Check overlapping rooms
-- 4. Price Calculation
-- 5. Update status room & quantity service
-- 6. Insert
-- ========================================================
DROP PROCEDURE IF EXISTS sp_create_booking //
CREATE PROCEDURE sp_create_booking(
    IN p_booking_id CHAR(36),
    IN p_short_id VARCHAR(10),
    IN p_customer_id CHAR(36),
    IN p_staff_id CHAR(36),
    IN p_check_in DATETIME,
    IN p_check_out DATETIME,
    IN p_room_type_id CHAR(36),
    IN p_room_ids JSON,
    IN p_services JSON,
    IN p_discount DECIMAL(10,2)
)
BEGIN
    DECLARE v_hours_diff DECIMAL(10,2);
    DECLARE v_blocks INT;
    DECLARE v_remaining_hours DECIMAL(10,2);
    DECLARE v_total_room_price DECIMAL(15,2) DEFAULT 0;
    DECLARE v_total_service_price DECIMAL(15,2) DEFAULT 0;
    DECLARE v_grand_total DECIMAL(15,2) DEFAULT 0;
    DECLARE v_room_count INT;
    DECLARE v_valid_room_count INT;
    DECLARE v_overlap_count INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    -- 1. Check dates is valid
    IF p_check_in >= p_check_out THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'checkOut must be after checkIn';
    END IF;

    SET v_room_count = JSON_LENGTH(p_room_ids);
    
    -- 2. Lock & Validate Rooms (Type, Status, and Existence)
    SELECT COUNT(*) INTO v_valid_room_count
    FROM JSON_TABLE(p_room_ids, '$[*]' COLUMNS(room_id CHAR(36) PATH '$')) jt
    JOIN rooms r ON r.id = jt.room_id
    WHERE r.room_type_id = p_room_type_id 
      AND r.status != 'Out_of_Order'
    FOR UPDATE OF r;

    IF v_valid_room_count != v_room_count THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'One or more rooms are invalid, out of order, or wrong type';
    END IF;

    -- 3. Check overlapping bookings for these specific rooms
    SELECT COUNT(br.room_id) INTO v_overlap_count
    FROM JSON_TABLE(p_room_ids, '$[*]' COLUMNS(room_id CHAR(36) PATH '$')) jt
    JOIN booking_rooms br ON br.room_id = jt.room_id
    JOIN bookings b ON br.booking_id = b.id
    WHERE b.status IN ('Confirmed', 'Checked-in', 'Pending') 
      AND b.check_in_date < p_check_out 
      AND b.check_out_date > p_check_in
    FOR UPDATE OF b, br;

    IF v_overlap_count > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'One or more selected rooms are already booked for this timeframe';
    END IF;

    -- 4. Price Calculation
    SET v_hours_diff = TIMESTAMPDIFF(MINUTE, p_check_in, p_check_out) / 60.0;
    SET v_blocks = FLOOR(v_hours_diff / 8);
    SET v_remaining_hours = v_hours_diff - (v_blocks * 8);

    -- Room Price
    SELECT IFNULL(SUM(v_blocks * rt.price_per_night + v_remaining_hours * rt.base_price), 0)
    INTO v_total_room_price
    FROM JSON_TABLE(p_room_ids, '$[*]' COLUMNS(room_id CHAR(36) PATH '$')) jt
    JOIN rooms r ON r.id = jt.room_id
    JOIN room_types rt ON r.room_type_id = rt.id;

    SET v_total_room_price = v_total_room_price - v_total_room_price * (p_discount / 100);

    -- Service Price
    IF p_services IS NOT NULL AND JSON_LENGTH(p_services) > 0 THEN
        SELECT IFNULL(SUM(s.price * jt.quantity), 0)
        INTO v_total_service_price
        FROM JSON_TABLE(p_services, '$[*]' COLUMNS(
            service_id CHAR(36) PATH '$.serviceId',
            quantity DECIMAL(10,2) PATH '$.quantity'
        )) jt
        JOIN services s ON s.id = jt.service_id;
    END IF;

    SET v_grand_total = v_total_room_price + v_total_service_price;

    -- 5. Update status room
    UPDATE rooms r
    JOIN JSON_TABLE(p_room_ids, '$[*]' COLUMNS(room_id CHAR(36) PATH '$')) jt ON r.id = jt.room_id
    SET r.status = 'Reserved'
    WHERE r.id IN (SELECT jt.room_id FROM JSON_TABLE(p_room_ids, '$[*]' COLUMNS(room_id CHAR(36) PATH '$')) jt);

    -- 6. Insert Main Booking Record
    INSERT INTO bookings (
        id, short_id, customer_id, staff_id, 
        check_in_date, check_out_date, 
        total_room_price, total_service_price, grand_total, 
        status, room_type_id
    )
    VALUES (
        p_booking_id, p_short_id, p_customer_id, p_staff_id, 
        p_check_in, p_check_out, 
        v_total_room_price, v_total_service_price, v_grand_total, 
        'Confirmed', p_room_type_id
    );

    -- Insert Booking Services mapping
    IF p_services IS NOT NULL AND JSON_LENGTH(p_services) > 0 THEN
        INSERT INTO booking_services (id, booking_id, service_id, quantity, price)
        SELECT UUID(), p_booking_id, jt.service_id, jt.quantity, s.price
        FROM JSON_TABLE(p_services, '$[*]' COLUMNS(
            service_id CHAR(36) PATH '$.serviceId',
            quantity DECIMAL(10,2) PATH '$.quantity'
        )) jt
        JOIN services s ON s.id = jt.service_id;

        -- Update quantity and status
        UPDATE services s
        JOIN JSON_TABLE(p_services, '$[*]' COLUMNS(
            service_id CHAR(36) PATH '$.serviceId',
            quantity DECIMAL(10,2) PATH '$.quantity'
        )) jt ON s.id = jt.service_id
        SET 
            s.status = CASE WHEN (s.quantity - jt.quantity) <= 0 THEN 'Inactive' ELSE s.status END,
            s.quantity = GREATEST(s.quantity - jt.quantity, 0)
        WHERE s.quantity != -1;
    END IF;


    -- Insert Booking Rooms mapping
    INSERT INTO booking_rooms (id, booking_id, room_id)
    SELECT UUID(), p_booking_id, jt.room_id
    FROM JSON_TABLE(p_room_ids, '$[*]' COLUMNS(room_id CHAR(36) PATH '$')) jt;

    COMMIT;
END //

-- ========================================================
-- sp_find_all_bookings
-- ========================================================
DROP PROCEDURE IF EXISTS sp_find_all_bookings //
CREATE PROCEDURE sp_find_all_bookings()
BEGIN
    SELECT * FROM v_bookings ORDER BY created_at DESC;
END //

-- ========================================================
-- sp_find_booking_by_id
-- ========================================================
DROP PROCEDURE IF EXISTS sp_find_booking_by_id //
CREATE PROCEDURE sp_find_booking_by_id(IN p_id CHAR(36))
BEGIN
    SELECT * FROM v_bookings WHERE id = p_id;
    
    SELECT r.id, r.room_number, r.room_type_id 
    FROM booking_rooms br 
    JOIN rooms r ON br.room_id = r.id 
    WHERE br.booking_id = p_id;
    
    SELECT s.name, bs.quantity, bs.price 
    FROM booking_services bs 
    JOIN services s ON bs.service_id = s.id 
    WHERE bs.booking_id = p_id;
END //

-- ========================================================
-- sp_update_booking
-- ========================================================
DROP PROCEDURE IF EXISTS sp_update_booking //
CREATE PROCEDURE sp_update_booking(
    IN p_id CHAR(36),
    IN p_status VARCHAR(20),
    IN p_actual_check_in DATETIME,
    IN p_actual_check_out DATETIME,
    IN p_total_room_price DECIMAL(10,2),
    IN p_total_service_price DECIMAL(10,2),
    IN p_grand_total DECIMAL(10,2)
)
BEGIN
    IF p_status = 'Checked-in' THEN
        UPDATE rooms r
        JOIN booking_rooms br ON r.id = br.room_id
        SET r.status = 'Occupied'
        WHERE br.booking_id = p_id;
    END IF;

    IF p_status IN ('Checked-out', 'Cancelled') THEN
        UPDATE rooms r
        JOIN booking_rooms br ON r.id = br.room_id
        SET r.status = 'Vacant'
        WHERE br.booking_id = p_id;

        UPDATE services s
        JOIN booking_services bs ON s.id = bs.service_id
        SET 
            s.quantity = s.quantity + bs.quantity,
            s.status = 'Active'
        WHERE bs.booking_id = p_id AND s.quantity != -1;
    END IF;
    
    UPDATE bookings 
    SET status = IFNULL(p_status, status),
        actual_check_in = IFNULL(p_actual_check_in, actual_check_in),
        actual_check_out = IFNULL(p_actual_check_out, actual_check_out),
        total_room_price = IFNULL(p_total_room_price, total_room_price),
        total_service_price = IFNULL(p_total_service_price, total_service_price),
        grand_total = IFNULL(p_grand_total, grand_total)
    WHERE id = p_id;
END //

DELIMITER ;