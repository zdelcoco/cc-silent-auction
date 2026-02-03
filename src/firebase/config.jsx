import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCBJAQUscviTabYrqhASbACZLmjnNoTDw0",
  authDomain: "cc-silent-auction.firebaseapp.com",
  projectId: "cc-silent-auction",
  storageBucket: "cc-silent-auction.firebasestorage.app",
  messagingSenderId: "606103062082",
  appId: "1:606103062082:web:2cf6b18fb1c0a8893f4fdb",
  measurementId: "G-M0C3J9B3NE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore and Auth
export const db = getFirestore(app);
export const auth = getAuth(app);
