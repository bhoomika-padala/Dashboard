import { sensorData, thresholds, listenToSensorUpdates, getInitialSensorData } from './data.js';
import { runTests } from './test.js';

// Debug: Check if script is loaded
console.log('Script.js loaded');

// Initialize map
let map;
let markers = {};
let alertContainer;

// Function to get color based on status
function getStatusColor(status) {
    switch(status.toLowerCase()) {
        case 'normal': return '#1e7e34';
        case 'warning': return '#856404';
        case 'danger': return '#721c24';
        default: return '#666';
    }
}

// Function to create a gauge chart
function createGaugeChart(container, value, max, label, color) {
    console.log('Creating gauge chart:', { value, max, label, color });
    
    // For water level, we want to show the inverse of the distance
    // A smaller distance means higher water level (closer to overflow)
    const displayValue = label === 'Water Level' ? max - value : value;
    
    // Destroy existing gauge if it exists
    if (container.gauge) {
        container.gauge.destroy();
    }
    
    // Create gauge configuration
    const config = {
        angle: 0.25,
        lineWidth: 0.2,
        radiusScale: 0.9,
        pointer: {
            length: 0.6,
            strokeWidth: 0.035,
            color: '#000000'
        },
        limitMax: false,
        limitMin: false,
        colorStart: '#00ff00',
        colorStop: '#ff0000',
        strokeColor: '#E0E0E0',
        generateGradient: true,
        highDpiSupport: true,
        percentColors: [
            [0.0, "#00ff00"],  // Green
            [0.3, "#ffff00"],  // Yellow
            [0.6, "#ffa500"],  // Orange
            [1.0, "#ff0000"]   // Red
        ],
        renderTicks: {
            divisions: 5,
            divWidth: 1.1,
            divLength: 0.7,
            divColor: '#333333',
            subDivisions: 3,
            subLength: 0.5,
            subWidth: 0.6,
            subColor: '#666666'
        }
    };

    try {
        // Check if Gauge is available
        if (typeof Gauge === 'undefined') {
            console.error('Gauge library not loaded');
            return null;
        }

        // Ensure container is ready
        if (!container || !container.getContext) {
            console.error('Invalid container for gauge');
            return null;
        }

        // Set explicit canvas size
        container.width = 150;
        container.height = 150;

        // Create the gauge
        const gauge = new Gauge(container).setOptions(config);
        gauge.maxValue = max;
        gauge.setMinValue(0);
        gauge.animationSpeed = 32;
        
        // Force a reflow
        container.style.display = 'none';
        container.offsetHeight;
        container.style.display = '';
        
        // Set the value after ensuring the container is ready
        setTimeout(() => {
            try {
                gauge.set(displayValue);
                console.log('Gauge value set to:', displayValue);
            } catch (error) {
                console.error('Error setting gauge value:', error);
            }
        }, 100);

        // Add label with proper class
        const labelDiv = document.createElement('div');
        labelDiv.className = 'gauge-label';
        labelDiv.textContent = label;
        container.parentNode.insertBefore(labelDiv, container.nextSibling);

        // Add value display with proper class
        const valueDiv = document.createElement('div');
        valueDiv.className = 'gauge-value';
        valueDiv.style.color = color;
        valueDiv.textContent = label === 'Water Level' ? 
            `${max - displayValue} cm from top` : 
            `${displayValue} ppm`;
        container.parentNode.insertBefore(valueDiv, container.nextSibling);

        // Store gauge instance
        container.gauge = gauge;
        
        return gauge;
    } catch (error) {
        console.error('Error creating gauge:', error);
        return null;
    }
}

// Function to create a sensor card
function createSensorCard(sensor) {
    console.log('Creating sensor card for:', sensor.location);
    const card = document.createElement('div');
    card.className = 'sensor-card';
    card.id = `sensor-${sensor.id}`;
    
    // Create header
    const header = document.createElement('div');
    header.className = 'sensor-header';
    
    const location = document.createElement('div');
    location.className = 'sensor-location';
    location.textContent = sensor.location;
    
    const status = document.createElement('div');
    status.className = `sensor-status status-${sensor.status.toLowerCase()}`;
    status.textContent = sensor.status;
    
    header.appendChild(location);
    header.appendChild(status);
    card.appendChild(header);
    
    // Create gauges container
    const gaugesContainer = document.createElement('div');
    gaugesContainer.className = 'gauges-container';
    
    // Create water level gauge
    const waterLevelContainer = document.createElement('div');
    waterLevelContainer.className = 'gauge-container';
    const waterLevelCanvas = document.createElement('canvas');
    waterLevelCanvas.width = 150;
    waterLevelCanvas.height = 150;
    waterLevelContainer.appendChild(waterLevelCanvas);
    gaugesContainer.appendChild(waterLevelContainer);
    
    // Create gas level gauge
    const gasLevelContainer = document.createElement('div');
    gasLevelContainer.className = 'gauge-container';
    const gasLevelCanvas = document.createElement('canvas');
    gasLevelCanvas.width = 150;
    gasLevelCanvas.height = 150;
    gasLevelContainer.appendChild(gasLevelCanvas);
    gaugesContainer.appendChild(gasLevelContainer);
    
    card.appendChild(gaugesContainer);
    
    // Add battery status
    const batteryStatus = document.createElement('div');
    batteryStatus.className = 'battery-status';
    batteryStatus.innerHTML = `Battery: <span style="color: ${getStatusColor(sensor.battery_status)}">${sensor.battery_status}</span>`;
    card.appendChild(batteryStatus);
    
    // Create the gauge charts after ensuring the card is in the DOM
    setTimeout(() => {
        createGaugeChart(
            waterLevelCanvas,
            sensor.water_level_cm,
            thresholds.waterLevel.normal,
            'Water Level',
            getStatusColor(sensor.status)
        );
        
        createGaugeChart(
            gasLevelCanvas,
            sensor.gas_ppm,
            thresholds.gasPPM.danger,
            'Gas Level',
            getStatusColor(sensor.status)
        );
    }, 200);
    
    return card;
}

// Function to update sensor card
function updateSensorCard(sensorId, data) {
    const card = document.getElementById(`sensor-${sensorId}`);
    if (card) {
        card.remove();
    }
    const newCard = createSensorCard(data);
    document.querySelector('.sensor-grid').appendChild(newCard);
}

// Function to show alert
function showAlert(sensor) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${sensor.status.toLowerCase()}`;
    alertDiv.innerHTML = `
        <strong>${sensor.location}</strong>: 
        ${sensor.status === 'Danger' ? 'Critical' : 'Warning'} levels detected
        <br>
        Water Level: ${sensor.water_level_cm} cm from top
        <br>
        Gas Level: ${sensor.gas_ppm} ppm
    `;
    
    alertContainer.appendChild(alertDiv);
    
    // Remove alert after 10 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 10000);
}

// Function to update map marker
function updateMapMarker(sensorId, data) {
    const { coordinates, status } = data;
    
    if (markers[sensorId]) {
        markers[sensorId].remove();
    }
    
    // Create custom marker icon
    const markerIcon = L.divIcon({
        className: `marker-${status.toLowerCase()}`,
        html: `<div class="marker-pin" style="background-color: ${getStatusColor(status)}"></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30]
    });
    
    // Create marker with popup
    const marker = L.marker([coordinates.lat, coordinates.lng], {
        icon: markerIcon
    }).addTo(map);
    
    // Add popup with sensor information
    marker.bindPopup(`
        <div class="marker-popup">
            <strong>${data.location}</strong><br>
            Status: ${data.status}<br>
            Water Level: ${data.water_level_cm} cm<br>
            Gas Level: ${data.gas_ppm} ppm
        </div>
    `);
    
    markers[sensorId] = marker;
}

// Function to update test button state
function updateTestButtonState(isLoading, error = null) {
    const testButton = document.getElementById('testButton');
    if (!testButton) return;

    if (isLoading) {
        testButton.disabled = true;
        testButton.innerHTML = '<span class="button-icon">⌛</span> Running Test...';
    } else if (error) {
        testButton.disabled = false;
        testButton.innerHTML = '<span class="button-icon">⚠️</span> Test Failed - Retry';
        showAlert({
            location: 'System Test',
            status: 'Danger',
            water_level_cm: 0,
            gas_ppm: 0
        });
    } else {
        testButton.disabled = false;
        testButton.innerHTML = '<span class="button-icon">⚡</span> Run System Test';
    }
}

// Initialize the dashboard
async function initDashboard() {
    console.log('Initializing dashboard');
    
    // Initialize map with a default view of London
    map = L.map('map', {
        center: [51.5074, -0.1278],
        zoom: 13,
        zoomControl: false // We'll add custom controls
    });
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);
    
    // Add zoom controls
    L.control.zoom({
        position: 'topright'
    }).addTo(map);
    
    // Initialize alert container
    alertContainer = document.getElementById('alert-container');
    
    // Initialize sensor grid
    const sensorGrid = document.querySelector('.sensor-grid');
    if (!sensorGrid) {
        console.error('Could not find .sensor-grid element');
        return;
    }

    try {
        // Get initial sensor data
        const initialData = await getInitialSensorData();
        console.log('Initial sensor data:', initialData);

        // Create initial sensor cards and markers
        initialData.forEach(sensor => {
            console.log('Creating card and marker for sensor:', sensor);
            const card = createSensorCard(sensor);
            sensorGrid.appendChild(card);
            updateMapMarker(sensor.id, sensor);
        });

        // Fit map bounds to show all markers
        if (initialData.length > 0) {
            const bounds = L.latLngBounds(initialData.map(sensor => 
                [sensor.coordinates.lat, sensor.coordinates.lng]
            ));
            map.fitBounds(bounds, { padding: [50, 50] });
        }

        // Listen for real-time updates
        listenToSensorUpdates((sensorId, data) => {
            console.log('Received sensor update:', sensorId, data);
            // Update sensor card
            updateSensorCard(sensorId, data);
            
            // Update map marker
            updateMapMarker(sensorId, data);
            
            // Show alert if status is warning or danger
            if (data.status === 'Warning' || data.status === 'Danger') {
                showAlert(data);
            }
        });
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showAlert({
            location: 'System',
            status: 'Danger',
            water_level_cm: 0,
            gas_ppm: 0
        });
    }

    // Add test button functionality
    const testButton = document.getElementById('testButton');
    if (testButton) {
        testButton.addEventListener('click', async () => {
            updateTestButtonState(true);
            try {
                await runTests();
                updateTestButtonState(false);
            } catch (error) {
                console.error('Test failed:', error);
                updateTestButtonState(false, error);
            }
        });
    }
}

// Start the dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    initDashboard();
}); 