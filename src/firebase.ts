import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
// TODO: Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAL0lRCPfOrOMGiWr37NUmIQmTFl0sAwBQ",
  authDomain: "stela-mobile.firebaseapp.com",
  projectId: "stela-mobile",
  storageBucket: "stela-mobile.firebasestorage.app",
  messagingSenderId: "814460313565",
  appId: "1:814460313565:web:9f3d239519712d1d05e034",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
