CREATE OR REPLACE VIEW v_bookings AS
SELECT
    b.id,
    b.short_id          AS shortId,
    b.customer_id       AS customerId,
    c.full_name         AS customerName,
    c.email             AS customerEmail,
    c.phone             AS customerPhone,
    b.staff_id          AS staffId,
    s.full_name         AS staffName,
    b.check_in_date     AS checkInDate,
    b.check_out_date    AS checkOutDate,
    b.actual_check_in   AS actualCheckIn,
    b.actual_check_out  AS actualCheckOut,
    b.total_room_price  AS totalRoomPrice,
    b.total_service_price AS totalServicePrice,
    b.discount,
    b.grand_total       AS grandTotal,
    b.deposit,
    b.status,
    b.created_at        AS createdAt,
    b.updated_at        AS updatedAt
FROM bookings b
LEFT JOIN users c ON b.customer_id = c.id
LEFT JOIN users s ON b.staff_id = s.id;