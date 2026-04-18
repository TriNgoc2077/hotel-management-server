CREATE TABLE coupons (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(255) NOT NULL UNIQUE,
    discount_type VARCHAR(255) NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL,
    coupon_status ENUM('Active', 'Inactive') DEFAULT 'Active',
    expired_at TIMESTAMP NOT NULL DEFAULT NOW() + INTERVAL 2 WEEK,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- view coupon
CREATE OR REPLACE VIEW view_coupons AS
SELECT 
    c.id,
    c.code,
    c.discount_type AS discountType,
    c.discount_value AS discountValue,
    c.coupon_status AS couponStatus,
    c.expired_at AS expiredAt,
    c.created_at AS createdAt,
    c.updated_at AS updatedAt
FROM coupons c
WHERE c.coupon_status = 'Active' AND c.expired_at > NOW();

-- DELETE issued_by column in invoices table
ALTER TABLE invoices DROP COLUMN issued_by;