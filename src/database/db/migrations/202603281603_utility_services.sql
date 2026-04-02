-- =========================================================
-- Stored Procedures CRUD on table `services`
-- =========================================================

DROP PROCEDURE IF EXISTS sp_create_service;
DELIMITER //
CREATE PROCEDURE sp_create_service (
    IN p_id CHAR(36),
    IN p_name VARCHAR(100),
    IN p_description TEXT,
    IN p_price DECIMAL(10,2),
    IN p_status VARCHAR(20),
    IN p_type VARCHAR(20)
)
BEGIN
    INSERT INTO `services` (
        `id`,
        `name`,
        `description`,
        `price`,
        `status`,
        `type`
    ) VALUES (
        p_id,
        p_name,
        p_description,
        p_price,
        p_status,
        p_type
    );
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_get_services;
DELIMITER //
CREATE PROCEDURE sp_get_services (
    IN p_limit INT,
    IN p_offset INT
)
BEGIN
    SELECT COUNT(*) as totalItems FROM `services`;

    SELECT 
        `id`,
        `name`,
        `description`,
        `price`,
        `status`,
        `type`
    FROM `services`
    LIMIT p_limit OFFSET p_offset;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_get_service_by_id;
DELIMITER //
CREATE PROCEDURE sp_get_service_by_id (
    IN p_id CHAR(36)
)
BEGIN
    SELECT 
        `id`,
        `name`,
        `description`,
        `price`,
        `status`,
        `type`
    FROM `services`
    WHERE `id` = p_id;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_update_service;
DELIMITER //
CREATE PROCEDURE sp_update_service (
    IN p_id CHAR(36),
    IN p_name VARCHAR(100),
    IN p_description TEXT,
    IN p_price DECIMAL(10,2),
    IN p_status VARCHAR(20),
    IN p_type VARCHAR(20)
)
BEGIN
    UPDATE `services`
    SET 
        `name` = COALESCE(p_name, `name`),
        `description` = COALESCE(p_description, `description`),
        `price` = COALESCE(p_price, `price`),
        `status` = COALESCE(p_status, `status`),
        `type` = COALESCE(p_type, `type`)
    WHERE `id` = p_id;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_delete_service;
DELIMITER //
CREATE PROCEDURE sp_delete_service (
    IN p_id CHAR(36)
)
BEGIN
    DELETE FROM `services`
    WHERE `id` = p_id;
END //
DELIMITER ;


-- ======================================================
-- add column type
-- ======================================================

ALTER TABLE `services`
ADD COLUMN `type` VARCHAR(20) NOT NULL DEFAULT 'service';

