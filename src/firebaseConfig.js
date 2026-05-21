import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDP894p7P3GRfm1Hy8kfQNtUVID_DO3nX0",
  authDomain: "the-home-connect-main.firebaseapp.com",
  projectId: "the-home-connect-main",
  storageBucket: "the-home-connect-main.firebasestorage.app",
  messagingSenderId: "37980698177",
  appId: "1:37980698177:web:bdcb9fb25ac8ce5cf138c0",
  measurementId: "G-TQ64X498L4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
