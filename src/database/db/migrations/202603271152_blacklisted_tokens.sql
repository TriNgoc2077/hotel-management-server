-- ===============================================
-- add blacklisted tokens table and procedure
-- ===============================================

CREATE TABLE `blacklisted_tokens` (
  `token` varchar(512) PRIMARY KEY,
  `expired_at` bigint NOT NULL
);

DELIMITER //

CREATE PROCEDURE sp_blacklist_token(
    IN p_token VARCHAR(512),
    IN p_expired_at BIGINT
)
BEGIN
    INSERT IGNORE INTO blacklisted_tokens (token, expired_at)
    VALUES (p_token, p_expired_at);
END //

DELIMITER ;
