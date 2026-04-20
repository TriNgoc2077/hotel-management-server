ALTER TABLE `bookings` 
    DROP COLUMN `check_in_date`, 
    DROP COLUMN `check_out_date`,
    ADD COLUMN `check_in_date` DATETIME,
    ADD COLUMN `check_out_date` DATETIME;