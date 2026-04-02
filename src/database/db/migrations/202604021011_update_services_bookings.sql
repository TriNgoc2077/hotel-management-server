-- ==================================================
-- add quantity to services
-- ==================================================
ALTER TABLE `services` ADD COLUMN `quantity` INT DEFAULT -1;

-- ==================================================
-- add discount and deposit to bookings
-- ==================================================
ALTER TABLE `bookings` ADD COLUMN `discount` DECIMAL(10,2) DEFAULT 0;
ALTER TABLE `bookings` ADD COLUMN `deposit` DECIMAL(10,2) DEFAULT 0;
