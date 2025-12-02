<?php
/**
 * API: Get Latest Readings
 * Returns the latest sensor readings for a specific station from the database
 * Used by dashboard.php to display real-time data
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
        'success' => false,
        'error' => 'Missing station_id parameter'
    ]);
    exit;
}

// Fetch the latest reading from waterdata table
$stmt = $conn->prepare("
    SELECT 
        tdsvalue, phvalue, turbidityvalue, leadvalue, colorvalue,
        tdsstatus, phstatus, turbiditystatus, leadstatus, colorstatus,
        colorresult, timestamp
    FROM waterdata 
    WHERE stationid = ? 
    ORDER BY timestamp DESC 
    LIMIT 1
");

if (!$stmt) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database prepare error'
    ]);
    exit;
}

$stmt->bind_param('i', $station_id);
$stmt->execute();
$result = $stmt->get_result();
$data = $result->fetch_assoc();
$stmt->close();

if ($data) {
    // Return data in the format expected by dashboard
    echo json_encode([
        'success' => true,
        'TDS_Value' => floatval($data['tdsvalue']),
        'TDS_Status' => $data['tdsstatus'],
        'PH_Value' => floatval($data['phvalue']),
        'PH_Status' => $data['phstatus'],
        'Turbidity_Value' => floatval($data['turbidityvalue']),
        'Turbidity_Status' => $data['turbiditystatus'],
        'Lead_Value' => floatval($data['leadvalue']),
        'Lead_Status' => $data['leadstatus'],
        'Color_Value' => floatval($data['colorvalue']),
        'Color_Status' => $data['colorstatus'],
        'Color_Result' => $data['colorresult'],
        'timestamp' => $data['timestamp']
    ]);
} else {
    http_response_code(404);
    echo json_encode([
        'success' => false,
        'error' => 'No readings found for this station'
    ]);
}
?>