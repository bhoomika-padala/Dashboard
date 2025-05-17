import { db } from './firebase-config.js';
import { doc, setDoc, serverTimestamp, collection } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { sensorData } from './data.js';

// Function to check if Firebase is properly initialized
function isFirebaseInitialized() {
    if (!db) {
        console.error('Firebase Firestore is not initialized');
        return false;
    }
    return true;
}

// Function to add test data
async function addTestData() {
    console.log('Adding test data to Firestore...');
    
    if (!isFirebaseInitialized()) {
        throw new Error('Firebase not initialized');
    }

    try {
        const sensorsCollection = collection(db, 'sensors');
        
        for (const sensor of sensorData) {
            const sensorDoc = doc(sensorsCollection, sensor.id);
            await setDoc(sensorDoc, {
                ...sensor,
                last_updated: serverTimestamp()
            });
            console.log(`Added sensor: ${sensor.location}`);
        }
        console.log('Test data added successfully!');
    } catch (error) {
        console.error('Error adding test data:', error);
        throw error;
    }
}

// Function to simulate sensor updates
async function simulateSensorUpdates() {
    console.log('Starting sensor update simulation...');
    
    if (!isFirebaseInitialized()) {
        throw new Error('Firebase not initialized');
    }

    try {
        const sensorsCollection = collection(db, 'sensors');
        
        // Update water level to trigger warning
        const sensorA1Doc = doc(sensorsCollection, 'manhole_a1');
        await setDoc(sensorA1Doc, {
            ...sensorData[0],
            water_level_cm: 35, // Should trigger warning
            status: "Warning",
            last_updated: serverTimestamp()
        });
        console.log('Updated Manhole A1 to warning state');
        
        // Wait 5 seconds
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Update gas level to trigger danger
        const sensorB3Doc = doc(sensorsCollection, 'manhole_b3');
        await setDoc(sensorB3Doc, {
            ...sensorData[1],
            gas_ppm: 350, // Should trigger danger
            status: "Danger",
            last_updated: serverTimestamp()
        });
        console.log('Updated Manhole B3 to danger state');
        
        // Wait 5 seconds
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Reset to normal state
        await setDoc(sensorA1Doc, {
            ...sensorData[0],
            last_updated: serverTimestamp()
        });
        await setDoc(sensorB3Doc, {
            ...sensorData[1],
            last_updated: serverTimestamp()
        });
        console.log('Reset sensors to normal state');
    } catch (error) {
        console.error('Error simulating sensor updates:', error);
        throw error;
    }
}

// Run the tests
async function runTests() {
    console.log('Starting Firebase integration tests...');
    
    if (!isFirebaseInitialized()) {
        throw new Error('Firebase not initialized');
    }
    
    try {
        // Add initial test data
        await addTestData();
        
        // Wait 2 seconds
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Simulate sensor updates
        await simulateSensorUpdates();
        
        console.log('Tests completed successfully!');
    } catch (error) {
        console.error('Test failed:', error);
        throw error;
    }
}

// Export the test function
export { runTests }; 