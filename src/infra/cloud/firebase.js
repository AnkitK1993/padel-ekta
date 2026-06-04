// ── FIREBASE · cloud connection seam ───────────────────────────
// Infrastructure layer: the single place that initialises Firebase and owns the
// app/Firestore/Auth singletons. The rest of the app imports Firebase ONLY
// through this module — both the long-lived handles (db / auth / provider) and
// the SDK primitives it calls (doc / setDoc / onSnapshot / the auth flow). That
// keeps the SDK version + project config + init in one spot, so the data/auth
// logic in app.js no longer reaches straight into the gstatic CDN.
//
// This is the connection seam only — the save/load *logic* (saveCloudData,
// loadCloudData, _resubscribeFirestore, …) intentionally stays in app.js for
// now and will move behind a repository interface once there is online-path
// test coverage. Extracting just the handles is covered by the existing offline
// smoke (a broken init means app.js can't evaluate and the app won't boot).
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCLXji1E8S_i2zLiYphHKjPLtpo9ODvOlI",
  authDomain: "padelekta-99316.firebaseapp.com",
  databaseURL:
    "https://padelekta-99316-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "padelekta-99316",
  storageBucket: "padelekta-99316.firebasestorage.app",
  messagingSenderId: "742104410143",
  appId: "1:742104410143:web:2d546ca8ab2f7ca16f4d2a",
  measurementId: "G-LN19GL652D",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
// Request Drive file scope so backup-to-Drive works without a second popup.
provider.addScope("https://www.googleapis.com/auth/drive.file");

// SDK primitives the rest of the app calls (Firestore ops + auth flow).
export {
  doc,
  setDoc,
  onSnapshot,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
};
