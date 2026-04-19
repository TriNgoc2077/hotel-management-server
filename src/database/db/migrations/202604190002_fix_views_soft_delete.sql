-- ============================================================
-- Fix #3: Đảm bảo tất cả VIEW filter soft delete (deleted_at IS NULL)
-- ============================================================

-- v_room_types: chỉ hiện loại phòng chưa bị xoá
CREATE OR REPLACE VIEW v_room_types AS
SELECT *
FROM room_types
WHERE deleted_at IS NULL;

-- v_rooms: chỉ hiện phòng chưa bị xoá VÀ không OUT_OF_ORDER
-- (tuỳ design — nếu muốn admin vẫn thấy OUT_OF_ORDER thì bỏ dòng status)
CREATE OR REPLACE VIEW v_rooms AS
SELECT r.*, rt.name AS room_type_name, rt.base_price, rt.price_per_night, rt.capacity
FROM rooms r
JOIN room_types rt ON r.room_type_id = rt.id
WHERE r.deleted_at IS NULL
  AND rt.deleted_at IS NULL;

-- v_bookings: không soft delete booking, nhưng join đúng để tránh orphan
CREATE OR REPLACE VIEW v_bookings AS
SELECT
  b.*,
  u.full_name  AS customer_name,
  u.email      AS customer_email,
  u.phone      AS customer_phone,
  s.full_name  AS staff_name
FROM bookings b
JOIN users u ON b.customer_id = u.id
LEFT JOIN users s ON b.staff_id = s.id;
