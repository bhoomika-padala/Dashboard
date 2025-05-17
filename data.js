import { db } from './firebase-config.js';
import { doc, setDoc, onSnapshot, serverTimestamp, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

console.log('Data.js loaded');

// Thresholds for different measurements (in cm from top)
const thresholds = {
    waterLevel: {
        normal: 80,    // Water level is 80cm or more from top (safe)
        warning: 50,   // Water level is 50cm from top (getting high)
        danger: 30     // Water level is 30cm or less from top (risk of overflow)
    },
    gasPPM: {
        normal: 100,
        warning: 200,
        danger: 300
    }
};

// Initial sensor data (will be replaced by Firestore data)
const sensorData = [
    {
        "id": "manhole_a1",
        "location": "Manhole A1",
        "water_level_cm": 85,  // 85cm from top (safe)
        "gas_ppm": 80,
        "battery_status": "Good",
        "status": "Normal",
        "coordinates": {
            "lat": 51.5074,
            "lng": -0.1278
        },
        "last_updated": new Date()
    },
    {
        "id": "manhole_b3",
        "location": "Manhole B3",
        "water_level_cm": 45,  // 45cm from top (warning)
        "gas_ppm": 160,
        "battery_status": "Low",
        "status": "Warning",
        "coordinates": {
            "lat": 51.5075,
            "lng": -0.1279
        },
        "last_updated": new Date()
    },
    {
        "id": "manhole_c2",
        "location": "Manhole C2",
        "water_level_cm": 25,  // 25cm from top (danger)
        "gas_ppm": 320,
        "battery_status": "Critical",
        "status": "Danger",
        "coordinates": {
            "lat": 51.5076,
            "lng": -0.1280
        },
        "last_updated": new Date()
    },
    {
        "id": "manhole_d4",
        "location": "Manhole D4",
        "water_level_cm": 90,  // 90cm from top (safe)
        "gas_ppm": 60,
        "battery_status": "Good",
        "status": "Normal",
        "coordinates": {
            "lat": 51.5077,
            "lng": -0.1281
        },
        "last_updated": new Date()
    }
];

// Function to determine sensor status based on thresholds
function determineStatus(waterLevel, gasLevel) {
    // For water level, smaller distance means higher water level (closer to overflow)
    if (waterLevel <= thresholds.waterLevel.danger || gasLevel >= thresholds.gasPPM.danger) {
        return 'Danger';
    } else if (waterLevel <= thresholds.waterLevel.warning || gasLevel >= thresholds.gasPPM.warning) {
        return 'Warning';
    }
    return 'Normal';
}

// Function to update sensor data in Firestore with retry logic
async function updateSensorData(sensorId, data, retryCount = 3) {
    for (let i = 0; i < retryCount; i++) {
        try {
            await setDoc(doc(db, 'sensors', sensorId), {
                ...data,
                last_updated: serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error(`Error updating sensor data (attempt ${i + 1}/${retryCount}):`, error);
            if (i === retryCount - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
        }
    }
    return false;
}

// Function to get initial sensor data from Firestore with retry logic
async function getInitialSensorData(retryCount = 3) {
    for (let i = 0; i < retryCount; i++) {
        try {
            const querySnapshot = await getDocs(collection(db, 'sensors'));
            if (querySnapshot.empty) {
                console.log('No sensor data found in Firestore, using static data');
                return sensorData;
            }
            
            const data = [];
            querySnapshot.forEach((doc) => {
                data.push({ id: doc.id, ...doc.data() });
            });
            return data;
        } catch (error) {
            console.error(`Error getting initial sensor data (attempt ${i + 1}/${retryCount}):`, error);
            if (i === retryCount - 1) {
                console.warn('Using static data due to connection error');
                return sensorData;
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
        }
    }
    return sensorData;
}

// Function to listen for real-time updates with error handling
function listenToSensorUpdates(callback) {
    let unsubscribe = null;
    
    try {
        unsubscribe = onSnapshot(collection(db, 'sensors'), 
            (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added' || change.type === 'modified') {
                        const data = change.doc.data();
                        callback(change.doc.id, data);
                    }
                });
            },
            (error) => {
                console.error('Error listening to sensor updates:', error);
                // Attempt to reconnect after 5 seconds
                setTimeout(() => {
                    console.log('Attempting to reconnect to Firestore...');
                    if (unsubscribe) unsubscribe();
                    listenToSensorUpdates(callback);
                }, 5000);
            }
        );
    } catch (error) {
        console.error('Error setting up sensor updates listener:', error);
    }
    
    return unsubscribe;
}

// Export for use in other files
export { 
    sensorData, 
    thresholds, 
    determineStatus, 
    updateSensorData, 
    listenToSensorUpdates,
    getInitialSensorData 
};

console.log('Sensor data initialized:', sensorData); 