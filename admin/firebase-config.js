/* ============================================
   FIREBASE CONFIGURATION — FreshNest
   ------------------------------------------
   1. Go to https://console.firebase.google.com
   2. Create a project (or use an existing one)
   3. Click "Add app" -> Web (</>) and register FreshNest
   4. Copy the config object Firebase gives you and paste it below
   5. In the Firebase Console, go to Firestore Database -> Create database
      (start in "test mode" while developing)
   ============================================ */

 const firebaseConfig = {
    apiKey: "AIzaSyBPipKtik3SIfBPUWDn6nxalgz9om3Bcas",
    authDomain: "warehouse-bec8f.firebaseapp.com",
    projectId: "warehouse-bec8f",
    storageBucket: "warehouse-bec8f.firebasestorage.app",
    messagingSenderId: "848016284288",
    appId: "1:848016284288:web:d3c7c2ad94c2796d142465",
    measurementId: "G-JWLVTT80JZ"
  };

// Initialize Firebase (must run before products.js / orders.js)
firebase.initializeApp(firebaseConfig);

// Firestore database reference — used by all other files
const db = firebase.firestore();
/* ============================================
   ACTIVITY LOG FUNCTIONS
============================================ */

async function addActivity(action, details) {

    try {

        await db.collection("activityLogs").add({

            action: action,
            details: details,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()

        });

    } catch (err) {

        console.error("Activity Log Error:", err);

    }

}

async function getActivities() {

    const snapshot = await db
        .collection("activityLogs")
        .orderBy("timestamp", "desc")
        .get();

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

}
