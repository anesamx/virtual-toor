// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBZ9afNDWUwdsnEaphf3s7DDY57q_2LpOc",
  authDomain: "visual-tour.firebaseapp.com",
  projectId: "visual-tour",
  storageBucket: "visual-tour.firebasestorage.app",
  messagingSenderId: "600970989782",
  appId: "1:600970989782:web:700bd78f6fdb0fb6693977",
  measurementId: "G-YX51G5M89P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the Firestore database instance so other scripts can use it
export const db = getFirestore(app);