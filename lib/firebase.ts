import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  increment,
  limit,
  Timestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCuABgGQJk82MYdhsSECDp8hhbwKqGlR4Q",
  authDomain: "status-world-b37dc.firebaseapp.com",
  projectId: "status-world-b37dc",
  storageBucket: "status-world-b37dc.firebasestorage.app",
  messagingSenderId: "236695793865",
  appId: "1:236695793865:web:1f7d5bcdb924869a409d18",
  measurementId: "G-C2CXWJXV55",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export {
  app,
  auth,
  db,
  googleProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  increment,
  limit,
  Timestamp,
};

export type { ConfirmationResult };

// Cloudinary config
export const CLOUDINARY_CLOUD_NAME = "dbvjv9rf3";
export const CLOUDINARY_UPLOAD_PRESET = "Status_World";

// Upload to Cloudinary
export async function uploadToCloudinary(file: File): Promise<{ url: string; type: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!res.ok) {
    throw new Error("Upload failed");
  }

  const data = await res.json();
  return {
    url: data.secure_url,
    type: data.resource_type,
  };
}
