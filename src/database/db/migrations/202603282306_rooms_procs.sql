-- ==============================================
-- add images column to room_types table
-- ==============================================
ALTER TABLE `room_types` 
ADD COLUMN `images` JSON;

-- ==============================================
-- remove name and images from rooms table
-- ==============================================
ALTER TABLE `rooms` 
DROP COLUMN `name`,
DROP COLUMN `images`;


--========================================
-- create room_types procedures and views
--========================================
DROP PROCEDURE IF EXISTS sp_create_room_type;
DELIMITER //
CREATE PROCEDURE sp_create_room_type (
    IN p_id CHAR(36),
    IN p_name VARCHAR(50),
    IN p_description TEXT,
    IN p_images JSON,
    IN p_base_price DECIMAL(10,2),
    IN p_capacity INT
)
BEGIN
    INSERT INTO room_types (id, name, description, images, base_price, capacity)
    VALUES (p_id, p_name, p_description, p_images, p_base_price, p_capacity);
END //
DELIMITER ;


DROP PROCEDURE IF EXISTS sp_update_room_type;
DELIMITER //
CREATE PROCEDURE sp_update_room_type (
    IN p_id CHAR(36),
    IN p_name VARCHAR(50),
    IN p_description TEXT,
    IN p_images JSON,
    IN p_base_price DECIMAL(10,2),
    IN p_capacity INT
)
BEGIN
    UPDATE room_types 
    SET 
        name = IFNULL(p_name, name),
        description = IFNULL(p_description, description),
        images = IFNULL(p_images, images),
        base_price = IFNULL(p_base_price, base_price),
        capacity = IFNULL(p_capacity, capacity)
    WHERE id = p_id;
END //
DELIMITER ;

DROP VIEW IF EXISTS v_room_types;
CREATE OR REPLACE VIEW v_room_types AS
SELECT 
    rt.id,
    rt.name,
    rt.description,
    rt.images,
    rt.base_price AS basePrice,
    rt.price_per_night AS pricePerNight,
    rt.capacity,
    rt.is_public AS isPublic
FROM room_types rt;

DROP VIEW IF EXISTS v_rooms;
CREATE OR REPLACE VIEW v_rooms AS
SELECT 
    r.id, 
    r.room_number, 
    r.description,
    r.is_public,
    r.room_type_id, 
    rt.name AS room_type_name,
    r.status
FROM rooms r
JOIN room_types rt ON r.room_type_id = rt.id;

--========================================
-- create rooms procedures
--========================================

DROP PROCEDURE IF EXISTS sp_create_room;
DELIMITER //
CREATE PROCEDURE sp_create_room (
    IN p_id CHAR(36),
    IN p_room_number VARCHAR(10),
    IN p_description TEXT,
    IN p_is_public BOOLEAN,
    IN p_room_type_id CHAR(36),
    IN p_status VARCHAR(20)
)
BEGIN
    INSERT INTO rooms (
        id, room_number, description, is_public, room_type_id, status, created_at
    ) VALUES (
        p_id, p_room_number, p_description, p_is_public, p_room_type_id, p_status, CURRENT_TIMESTAMP
    );
END //
DELIMITER ;


DROP PROCEDURE IF EXISTS sp_update_room;
DELIMITER //
CREATE PROCEDURE sp_update_room (
    IN p_id CHAR(36),
    IN p_room_number VARCHAR(10),
    IN p_description TEXT,
    IN p_is_public BOOLEAN,
    IN p_room_type_id CHAR(36),
    IN p_status VARCHAR(20)
)
BEGIN
    UPDATE rooms 
    SET 
        room_number = IFNULL(p_room_number, room_number),
        description = IFNULL(p_description, description),
        is_public = IFNULL(p_is_public, is_public),
        room_type_id = IFNULL(p_room_type_id, room_type_id),
        status = IFNULL(p_status, status)
    WHERE id = p_id;
END //
DELIMITER ;