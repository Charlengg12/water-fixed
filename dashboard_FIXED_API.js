
<script>
/*
 * FIXED: ESP32 Communication via Server API
 * Browser → Server API → Database
 * ESP32 → Server (Push data)
 * ESP32 polls server for commands
 */

const STATION_ID = <?php echo json_encode($stationid ?? null); ?>;
const API_BASE = '/api'; // Adjust if your API folder is in different location

// API Endpoints (Server-side, not ESP32 direct)
const READINGS_URL = `${API_BASE}/api_get_latest_readings.php?station_id=${STATION_ID}`;
const START_TEST_URL = `${API_BASE}/api_start_test.php?station_id=${STATION_ID}`;

// Gauge configuration
const GAUGE_CONFIG = {
    tds: [1000, -130, 0],
    ph: [14, -130, 2],
    turbidity: [10, -130, 2],
    lead: [0.012, -130, 4],
    color: [100, -130, 0]
};

// Calculate needle rotation
function getNeedleRotation(param, value) {
    const [maxValue, minRotation] = GAUGE_CONFIG[param];
    const maxRotation = Math.abs(minRotation);
    const range = maxRotation - minRotation;
    let clampedValue = Math.min(Math.max(0, value), maxValue);
    let percentage = maxValue !== 0 ? clampedValue / maxValue : 0;
    return minRotation + (percentage * range);
}

// Rotate needle element
function rotateNeedle(param, value) {
    const needle = document.getElementById(`needle-${param}`);
    if (!needle) return;

    if (param === 'color') {
        needle.style.transform = `translate(-50%, 0) rotate(${GAUGE_CONFIG[param][1]}deg)`;
        return;
    }

    const rotation = getNeedleRotation(param, value);
    needle.style.transform = `translate(-50%, 0) rotate(${rotation}deg)`;
}

// Update individual gauge display
function updateGaugeDisplay(param, data, decimals = 0) {
    const paramValueKey = param.charAt(0).toUpperCase() + param.slice(1) + '_Value';
    const paramStatusKey = param.charAt(0).toUpperCase() + param.slice(1) + '_Status';

    let displayValue = '--';
    let displayStatus = 'NA';
    let sensorValue = 0;

    if (param === 'color') {
        displayValue = data.Color_Result !== undefined ? data.Color_Result : 
                      (data.Color_Value !== undefined ? data.Color_Value : '--');
        displayStatus = data.Color_Status || 'NA';
        rotateNeedle(param, 0);
    } else {
        const raw = data[paramValueKey];
        const parsed = parseFloat(raw);
        sensorValue = isNaN(parsed) ? 0 : parsed;
        displayValue = isNaN(parsed) ? '--' : parsed.toFixed(decimals);
        displayStatus = data[paramStatusKey] || 'NA';
        rotateNeedle(param, sensorValue);
    }

    // Update LCD
    const lcdElement = document.getElementById(`${param}-gauge-value`);
    if (lcdElement) {
        lcdElement.textContent = displayValue;
    }

    // Update status label
    const statusElement = document.getElementById(`${param}-status`);
    if (statusElement) {
        statusElement.className = 'status-label mt-2';
        const s = String(displayStatus).toLowerCase();
        if (s === 'safe') {
            statusElement.classList.add('status-safe');
        } else if (s === 'neutral') {
            statusElement.classList.add('status-neutral');
        } else if (s === 'warning') {
            statusElement.classList.add('status-warning');
        } else {
            statusElement.classList.add('status-failed');
        }
        statusElement.textContent = displayStatus;
    }
}

// Fetch readings from SERVER API (not ESP32 directly)
function fetchReadings() {
    const timestampElement = document.getElementById('last-update-timestamp');
    const statusMessageElement = document.getElementById('status-message');
    const sensorStatusLabel = document.getElementById('sensor-status-label');

    fetch(READINGS_URL)
        .then(response => {
            if (response.status === 200) {
                sensorStatusLabel.className = 'status-label status-online';
                sensorStatusLabel.innerHTML = 'ONLINE <span class="status-dot"></span>';
                statusMessageElement.textContent = `Connected to server. Data refreshing...`;
                return response.json();
            } else if (response.status === 404) {
                throw new Error('No Data');
            } else {
                throw new Error(`HTTP Status Error: ${response.status}`);
            }
        })
        .then(data => {
            if (data.success) {
                timestampElement.textContent = new Date(data.timestamp).toLocaleString();

                // Update all gauges
                for (const param in GAUGE_CONFIG) {
                    const [, , decimals] = GAUGE_CONFIG[param];
                    updateGaugeDisplay(param, data, decimals);
                }
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        })
        .catch(error => {
            console.error('Fetch Readings Error:', error);
            sensorStatusLabel.className = 'status-label status-offline';
            sensorStatusLabel.innerHTML = 'OFFLINE <span class="status-dot"></span>';

            if (error.message === 'No Data') {
                timestampElement.textContent = 'No readings yet';
                statusMessageElement.textContent = 'Waiting for first reading from ESP32...';
            } else {
                timestampElement.textContent = 'Connection Failed';
                statusMessageElement.textContent = `Error: ${error.message}`;
            }

            // Reset gauges to error state
            for (const param in GAUGE_CONFIG) {
                rotateNeedle(param, GAUGE_CONFIG[param][1]);
                const lcd = document.getElementById(`${param}-gauge-value`);
                if (lcd) lcd.textContent = '--';
                const st = document.getElementById(`${param}-status`);
                if (st) {
                    st.textContent = 'Error';
                    st.className = 'status-label mt-2 status-failed';
                }
            }
        });
}

// DOM Ready Event Wiring
document.addEventListener('DOMContentLoaded', () => {
    if (STATION_ID) {
        fetchReadings();
        setInterval(fetchReadings, 5000); // Poll every 5 seconds
    } else {
        document.getElementById('status-message').textContent = 
            'Please select a refilling station to start monitoring.';
    }

    // Start Testing button
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            if (!STATION_ID) {
                alert('Please select a station first.');
                return;
            }

            fetch(START_TEST_URL, { method: 'POST' })
                .then(res => {
                    if (res.status === 200) {
                        return res.json();
                    } else {
                        throw new Error(`Server error: ${res.status}`);
                    }
                })
                .then(data => {
                    if (data.success) {
                        alert('Test command sent! ESP32 will start test on next poll.');
                    } else {
                        alert(data.message || 'Failed to queue test command.');
                    }
                    fetchReadings(); // Refresh immediately
                })
                .catch(err => {
                    console.error('Start Test Error:', err);
                    alert('Connection error: Could not send command to server.');
                });
        });
    }

    // Rest of your modal code remains the same...
    // (Auto Test Modal, frequency switching, Save Auto Test, Results Modal, Filter logic)
});
</script>
