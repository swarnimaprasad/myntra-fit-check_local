// // firebaseConfig.ts
// import { initializeApp } from "firebase/app";
// import { getDatabase } from "firebase/database";

// const firebaseConfig = {
//   apiKey: "YOUR_API_KEY",
//   authDomain: "YOUR_AUTH_DOMAIN",
//   databaseURL: "YOUR_DATABASE_URL",
//   projectId: "YOUR_PROJECT_ID",
//   storageBucket: "YOUR_STORAGE_BUCKET",
//   messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
//   appId: "YOUR_APP_ID"
// };

// const app = initializeApp(firebaseConfig);
// export const db = getDatabase(app);
// Import the functions you need from the SDKs you need
// Initialize Firebase
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "",
  authDomain: "myntra-hackerramp-db274.firebaseapp.com",
  databaseURL: "https://myntra-hackerramp-db274-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "myntra-hackerramp-db274",
  storageBucket: "myntra-hackerramp-db274.appspot.com",
  messagingSenderId: "935508174861",
  appId: "1:935508174861:web:bf66c948c257ae3a434d44",
  measurementId: "G-N9BYJC2K6D"
};


const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
