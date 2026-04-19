-- ============================================================
-- Fix #1: sp_create_room_type + sp_update_room_type thiếu price_per_night
-- Fix #2: sp_create_service + sp_update_service thiếu quantity
-- ============================================================

-- ─── ROOM TYPE ───────────────────────────────────────────────

DROP PROCEDURE IF EXISTS sp_create_room_type;
DELIMITER $$
CREATE PROCEDURE sp_create_room_type(
  IN p_id          VARCHAR(36),
  IN p_name        VARCHAR(50),
  IN p_description TEXT,
  IN p_images      JSON,
  IN p_base_price  DECIMAL(10,2),
  IN p_capacity    INT,
  IN p_price_per_night DECIMAL(10,2)   -- thêm mới
)
BEGIN
  INSERT INTO room_types (id, name, description, images, base_price, capacity, price_per_night)
  VALUES (p_id, p_name, p_description, p_images, p_base_price, p_capacity, p_price_per_night);
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_update_room_type;
DELIMITER $$
CREATE PROCEDURE sp_update_room_type(
  IN p_id          VARCHAR(36),
  IN p_name        VARCHAR(50),
  IN p_description TEXT,
  IN p_images      JSON,
  IN p_base_price  DECIMAL(10,2),
  IN p_capacity    INT,
  IN p_price_per_night DECIMAL(10,2)   -- thêm mới
)
BEGIN
  UPDATE room_types
  SET
    name             = COALESCE(p_name,             name),
    description      = COALESCE(p_description,      description),
    images           = COALESCE(p_images,           images),
    base_price       = COALESCE(p_base_price,       base_price),
    capacity         = COALESCE(p_capacity,          capacity),
    price_per_night  = COALESCE(p_price_per_night,  price_per_night)
  WHERE id = p_id;
END$$
DELIMITER ;

-- ─── SERVICE ─────────────────────────────────────────────────

DROP PROCEDURE IF EXISTS sp_create_service;
DELIMITER $$
CREATE PROCEDURE sp_create_service(
  IN p_id          VARCHAR(36),
  IN p_name        VARCHAR(100),
  IN p_description TEXT,
  IN p_price       DECIMAL(10,2),
  IN p_status      VARCHAR(20),
  IN p_type        VARCHAR(50),
  IN p_quantity    INT              -- thêm mới
)
BEGIN
  INSERT INTO services (id, name, description, price, status, type, quantity)
  VALUES (p_id, p_name, p_description, p_price, p_status, p_type, p_quantity);
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_update_service;
DELIMITER $$
CREATE PROCEDURE sp_update_service(
  IN p_id          VARCHAR(36),
  IN p_name        VARCHAR(100),
  IN p_description TEXT,
  IN p_price       DECIMAL(10,2),
  IN p_status      VARCHAR(20),
  IN p_type        VARCHAR(50),
  IN p_quantity    INT              -- thêm mới
)
BEGIN
  UPDATE services
  SET
    name        = COALESCE(p_name,        name),
    description = COALESCE(p_description, description),
    price       = COALESCE(p_price,       price),
    status      = COALESCE(p_status,      status),
    type        = COALESCE(p_type,        type),
    quantity    = COALESCE(p_quantity,    quantity)
  WHERE id = p_id;
END$$
DELIMITER ;
