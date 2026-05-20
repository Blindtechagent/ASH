// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA2PQqQqxCmHzs0dqjHerUnHhOQfP0WZL0",
    authDomain: "accessiblestudyhub-a56de.firebaseapp.com",
    projectId: "accessiblestudyhub-a56de",
    storageBucket: "accessiblestudyhub-a56de.firebasestorage.app",
    messagingSenderId: "21264920531",
    appId: "1:21264920531:web:32134bab465a54cd174926",
    measurementId: "G-9DLYFZ3LPY",
    databaseURL: "https://accessiblestudyhub-a56de-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    if (typeof firebase.analytics === 'function') {
        firebase.analytics();
    }
}
