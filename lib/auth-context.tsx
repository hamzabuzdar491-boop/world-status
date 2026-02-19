"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { auth, db, doc, setDoc, serverTimestamp } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { onSnapshot } from "firebase/firestore";

interface UserProfile {
  uid: string;
  displayName: string;
  email: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
  bio: string;
  createdAt: Date;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);

        // Ensure user doc exists first (create if not)
        try {
          await setDoc(
            userDocRef,
            {
              displayName: firebaseUser.displayName || "User",
              email: firebaseUser.email || null,
              phoneNumber: firebaseUser.phoneNumber || null,
              photoURL: firebaseUser.photoURL || null,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (err) {
          console.error("Error ensuring user doc:", err);
        }

        // Listen to user profile changes with error handling
        const unsubProfile = onSnapshot(
          userDocRef,
          (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              setProfile({
                uid: firebaseUser.uid,
                displayName: data.displayName || firebaseUser.displayName || "User",
                email: data.email || firebaseUser.email,
                phoneNumber: data.phoneNumber || firebaseUser.phoneNumber,
                photoURL: data.photoURL || firebaseUser.photoURL,
                bio: data.bio || "",
                createdAt: data.createdAt?.toDate() || new Date(),
              });
            } else {
              setProfile({
                uid: firebaseUser.uid,
                displayName: firebaseUser.displayName || "User",
                email: firebaseUser.email,
                phoneNumber: firebaseUser.phoneNumber,
                photoURL: firebaseUser.photoURL,
                bio: "",
                createdAt: new Date(),
              });
            }
            setLoading(false);
          },
          (error) => {
            console.error("Profile snapshot error:", error);
            // Fallback to Firebase Auth data
            setProfile({
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || "User",
              email: firebaseUser.email,
              phoneNumber: firebaseUser.phoneNumber,
              photoURL: firebaseUser.photoURL,
              bio: "",
              createdAt: new Date(),
            });
            setLoading(false);
          }
        );

        return () => unsubProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
