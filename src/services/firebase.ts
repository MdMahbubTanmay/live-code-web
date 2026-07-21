
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyB9Igj8R6TSBHVKY_MOeDc2KjteUzp0ATo",
  authDomain: "live-code-web.firebaseapp.com",
  projectId: "live-code-web",
  storageBucket: "live-code-web.firebasestorage.app",
  messagingSenderId: "1056156811377",
  appId: "1:1056156811377:web:a57f4d55de628cc7071bd0",
  measurementId: "G-8DP4SSWHG1"
};

const app = initializeApp(firebaseConfig);


export const db = getDatabase(app);
