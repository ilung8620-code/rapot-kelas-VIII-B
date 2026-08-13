// Ganti isi firebaseConfig di bawah dengan konfigurasi Web App dari Firebase Console.
// Project Settings > General > Your apps > Web app > SDK setup and configuration > Config
// Firebase Storage TIDAK diperlukan oleh aplikasi versi ini.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDKFviVi9mzfuFXybngMSd4um3B7-9dW2U",
  authDomain: "rapot-kelas-viii-b.firebaseapp.com",
  projectId: "rapot-kelas-viii-b",
  storageBucket: "rapot-kelas-viii-b.firebasestorage.app",
  messagingSenderId: "954679727840",
  appId: "1:954679727840:web:c49ddb6fee3cc412e76285",
  measurementId: "G-Z42MKTFTTB"
};

const requiredKeys = ["apiKey","authDomain","projectId","messagingSenderId","appId"];
export const firebaseReady = requiredKeys.every(key => firebaseConfig[key] && !String(firebaseConfig[key]).includes("GANTI_DENGAN"));
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
