-- ===============================================
-- update rt, fcmt, remove token procedures
-- ===============================================
DELIMITER //

-- DROP PROCEDURE IF EXISTS sp_update_refresh_token //
CREATE PROCEDURE sp_update_refresh_token(
    IN p_user_id CHAR(36),
    IN p_refresh_token VARCHAR(512),
    IN p_expired_at TIMESTAMP,
    IN p_agent VARCHAR(255)
)
BEGIN
    IF EXISTS (SELECT 1 FROM tokens WHERE user_id = p_user_id AND agent = p_agent) THEN
        UPDATE tokens 
        SET refresh_token = p_refresh_token, expired_at = p_expired_at
        WHERE user_id = p_user_id AND agent = p_agent;
    ELSE
        INSERT INTO tokens (id, user_id, refresh_token, agent, expired_at)
        VALUES (UUID(), p_user_id, p_refresh_token, p_agent, p_expired_at);
    END IF;
END //


-- DROP PROCEDURE IF EXISTS sp_update_fcm_token //
CREATE PROCEDURE sp_update_fcm_token(
    IN p_user_id CHAR(36),
    IN p_fcm_token VARCHAR(255),
    IN p_agent VARCHAR(255)
)
BEGIN
    IF EXISTS (SELECT 1 FROM tokens WHERE user_id = p_user_id AND agent = p_agent) THEN
        UPDATE tokens 
        SET fcm_token = p_fcm_token
        WHERE user_id = p_user_id AND agent = p_agent;
    ELSE
        INSERT INTO tokens (id, user_id, fcm_token, agent)
        VALUES (UUID(), p_user_id, p_fcm_token, p_agent);
    END IF;
END //

-- DROP PROCEDURE IF EXISTS sp_remove_token //
CREATE PROCEDURE sp_remove_token(
    IN p_user_id CHAR(36),
    IN p_agent VARCHAR(255)
)
BEGIN
    UPDATE tokens 
    SET fcm_token = NULL, refresh_token = NULL
    WHERE user_id = p_user_id AND agent = p_agent;
END //

DELIMITER ;