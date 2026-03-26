-- procedures
-- DROP PROCEDURE IF EXISTS sp_create_user;

DELIMITER //
CREATE PROCEDURE sp_create_user (
    IN p_id CHAR(36),
    IN p_role_id CHAR(36),
    IN p_full_name VARCHAR(100),
    IN p_email VARCHAR(100),
    IN p_password_hash VARCHAR(255),
    IN p_phone VARCHAR(20),
    IN p_address TEXT,
    IN p_status VARCHAR(20)
)
BEGIN
    INSERT INTO users (
        id, role_id, full_name, email, password_hash, phone, address, status, created_at, updated_at
    ) VALUES (
        p_id, p_role_id, p_full_name, p_email, p_password_hash, p_phone, p_address, p_status, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    );
END //
DELIMITER ;


-- DROP PROCEDURE IF EXISTS sp_update_user;

DELIMITER //
CREATE PROCEDURE sp_update_user (
    IN p_id CHAR(36),
    IN p_role_id CHAR(36),
    IN p_full_name VARCHAR(100),
    IN p_email VARCHAR(100),
    IN p_phone VARCHAR(20),
    IN p_address TEXT,
    IN p_status VARCHAR(20)
)
BEGIN
    UPDATE users 
    SET 
        role_id = IFNULL(p_role_id, role_id),
        full_name = IFNULL(p_full_name, full_name),
        email = IFNULL(p_email, email),
        phone = IFNULL(p_phone, phone),
        address = IFNULL(p_address, address),
        status = IFNULL(p_status, status)
    WHERE id = p_id;
END //
DELIMITER ;


-- View
CREATE OR REPLACE VIEW v_bookings AS
SELECT 
    b.id,
    b.short_id,
    b.customer_id,
    c.full_name AS customer_name,
    c.email AS customer_email,
    c.phone AS customer_phone,
    b.staff_id,
    s.full_name AS staff_name,
    b.check_in_date,
    b.check_out_date,
    b.actual_check_in,
    b.actual_check_out,
    b.total_room_price,
    b.total_service_price,
    b.grand_total,
    b.status,
    b.created_at,
    b.updated_at
FROM bookings b
LEFT JOIN users c ON b.customer_id = c.id
LEFT JOIN users s ON b.staff_id = s.id;


CREATE OR REPLACE VIEW v_rooms AS
SELECT 
    r.id, 
    r.room_number, 
    r.name,
    r.description,
    r.images,
    r.is_public,
    r.room_type_id, 
    rt.name AS room_type_name,
    rt.base_price,
    rt.capacity,
    r.status, 
    r.created_at
FROM rooms r
LEFT JOIN room_types rt ON r.room_type_id = rt.id;


CREATE OR REPLACE VIEW v_users AS
SELECT 
    u.id, 
    u.role_id, 
    r.name AS roleName,
    u.full_name AS fullName, 
    u.email, 
    u.phone, 
    u.address, 
    u.status, 
    u.created_at AS createdAt, 
    u.updated_at AS updatedAt
FROM users u
LEFT JOIN roles r ON u.role_id = r.id;


-- functions
-- DROP FUNCTION IF EXISTS fn_calculate_days;

DELIMITER //
CREATE FUNCTION fn_calculate_days (
    check_in DATE,
    check_out DATE
) 
RETURNS INT
DETERMINISTIC
BEGIN
    DECLARE days INT;
    SET days = DATEDIFF(check_out, check_in);
    IF days < 1 THEN
        SET days = 1;
    END IF;
    RETURN days;
END //
DELIMITER ;