-- ============================================================
-- SQL Schema for ESP32 Server Command System
-- ============================================================
-- This table stores commands from the dashboard to the ESP32
-- ESP32 polls this table via api_get_command.php
-- ============================================================

CREATE TABLE IF NOT EXISTS station_commands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stationid INT NOT NULL,
    command VARCHAR(50) NOT NULL,
    status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    executed_at TIMESTAMP NULL,
    UNIQUE KEY unique_station (stationid),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Table Description:
-- ============================================================
-- id: Auto-increment primary key
-- stationid: Links to refillingstations table
-- command: The command to execute (e.g., 'START_TEST')
-- status: 'pending' (new), 'completed' (executed), 'failed'
-- created_at: When the command was created
-- executed_at: When the ESP32 executed the command
--
-- UNIQUE KEY: Only one pending command per station at a time
--
-- ============================================================
-- Sample Queries:
-- ============================================================

-- Check pending commands for a station
SELECT * FROM station_commands 
WHERE stationid = 41 AND status = 'pending';

-- View all commands history
SELECT * FROM station_commands 
ORDER BY created_at DESC LIMIT 50;

-- Clear old completed commands (run periodically)
DELETE FROM station_commands 
WHERE status = 'completed' 
AND executed_at < DATE_SUB(NOW(), INTERVAL 7 DAY);

-- ============================================================
