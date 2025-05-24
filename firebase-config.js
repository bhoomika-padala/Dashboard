// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { firebaseConfig } from './firebase-config.local.js';

// Initialize Firebase
let app;
let db;
let auth;
let analytics;

try {
    app = initializeApp(firebaseConfig);
    analytics = getAnalytics(app);
    db = getFirestore(app);
    auth = getAuth(app);

    // Enable offline persistence
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code === 'unimplemented') {
            console.warn('The current browser does not support persistence.');
        }
    });

    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Error initializing Firebase:', error);
    // Show error to user
    const errorMessage = document.createElement('div');
    errorMessage.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background-color: #fce8e6;
        color: #c5221f;
        padding: 1rem;
        text-align: center;
        z-index: 1000;
    `;
    errorMessage.textContent = 'Error connecting to the server. Please refresh the page or try again later.';
    document.body.appendChild(errorMessage);
}

// Export for use in other files
export { db, auth };