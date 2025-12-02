<?php
/**
 * API: Get Command (For ESP32)
 * ESP32 polls this endpoint to check if there's a pending command
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Database connection
require_once('../includes/db.php'); // Adjust path if needed

// Get station ID from query parameter
$station_id = isset($_GET['station_id']) ? intval($_GET['station_id']) : null;

if (!$station_id) {
    http_response_code(400);
    echo json_encode([
        'command' => 'NONE',
        'error' => 'Missing station_id parameter'
    ]);
    exit;
}

// Check for pending commands
$stmt = $conn->prepare("
    SELECT id, command 
    FROM station_commands 
    WHERE stationid = ? AND status = 'pending' 
    ORDER BY created_at DESC 
    LIMIT 1
");

if (!$stmt) {
    echo json_encode(['command' => 'NONE']);
    exit;
}

$stmt->bind_param('i', $station_id);
$stmt->execute();
$result = $stmt->get_result();
$cmd = $result->fetch_assoc();
$stmt->close();

if ($cmd) {
    // Mark as completed
    $update_stmt = $conn->prepare("
        UPDATE station_commands 
        SET status = 'completed', executed_at = NOW() 
        WHERE id = ?
    ");
    if ($update_stmt) {
        $update_stmt->bind_param('i', $cmd['id']);
        $update_stmt->execute();
        $update_stmt->close();
    }

    echo json_encode([
        'command' => $cmd['command']
    ]);
} else {
    echo json_encode([
        'command' => 'NONE'
    ]);
}
?>