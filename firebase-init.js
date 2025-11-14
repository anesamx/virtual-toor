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
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();