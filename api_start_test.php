<?php
/**
 * API: Start Test Command
 * Creates a command for the ESP32 to start a test cycle
 * ESP32 polls this endpoint to check for commands
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Database connection
require_once('../includes/db.php'); // Adjust path if needed

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error' => 'Method not allowed. Use POST.'
    ]);
    exit;
}

// Get station ID from query parameter
$station_id = isset($_GET['station_id']) ? intval($_GET['station_id']) : null;

if (!$station_id) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Missing station_id parameter'
    ]);
    exit;
}

// Create or update command in database
// You'll need to create a 'station_commands' table
// See the SQL schema below

$command = 'START_TEST';
$stmt = $conn->prepare("
    INSERT INTO station_commands (stationid, command, status, created_at)
    VALUES (?, ?, 'pending', NOW())
    ON DUPLICATE KEY UPDATE 
        command = VALUES(command),
        status = 'pending',
        created_at = NOW()
");

if (!$stmt) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database prepare error'
    ]);
    exit;
}

$stmt->bind_param('is', $station_id, $command);

if ($stmt->execute()) {
    $stmt->close();
    echo json_encode([
        'success' => true,
        'message' => 'Test command queued for ESP32'
    ]);
} else {
    $stmt->close();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to queue command'
    ]);
}
?>

/* 
SQL SCHEMA FOR station_commands TABLE:

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
);
*/