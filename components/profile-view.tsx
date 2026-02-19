"use client";

import { useEffect, useState, useRef } from "react";
import {
  Settings,
  LogOut,
  Camera,
  Edit3,
  User,
  Grid3X3,
  X,
  Check,
  Shield,
  Heart,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import {
  auth,
  db,
  signOut,
  doc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  uploadToCloudinary,
} from "@/lib/firebase";
import { isStatusExpired } from "@/lib/utils";

interface UserStatus {
  id: string;
  url: string;
  type: string;
  createdAt: Date;
  likes: number;
}

export function ProfileView() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [statuses, setStatuses] = useState<UserStatus[]>([]);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(profile?.displayName || "");
  const [editBio, setEditBio] = useState(profile?.bio || "");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    setEditName(profile?.displayName || "");
    setEditBio(profile?.bio || "");
    // Check admin status
    const checkAdmin = async () => {
      const userDoc = await import("@/lib/firebase").then((m) => m.getDoc(m.doc(m.db, "users", user.uid)));
      if (userDoc.exists() && userDoc.data().isAdmin) {
        setUserIsAdmin(true);
      }
    };
    checkAdmin();
  }, [profile, user]);

  // Load user's statuses
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "statuses"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const items: UserStatus[] = [];
      snap.forEach((d) => {
        const data = d.data();
        const createdAt = data.createdAt instanceof Timestamp
          ? data.createdAt.toDate()
          : new Date();
        if (!isStatusExpired(createdAt)) {
          items.push({
            id: d.id,
            url: data.url,
            type: data.type,
            createdAt,
            likes: data.likes || 0,
          });
        }
      });
      setStatuses(items);
    });

    return () => unsub();
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid), {
      displayName: editName,
      bio: editBio,
    });
    setEditing(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingPhoto(true);
    try {
      const result = await uploadToCloudinary(file);
      await updateDoc(doc(db, "users", user.uid), {
        photoURL: result.url,
      });
    } catch (err) {
      console.error("Photo upload error:", err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const totalLikes = statuses.reduce((sum, s) => sum + s.likes, 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h1 className="text-foreground font-bold text-lg">پروفائل</h1>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                onClick={() => setEditing(false)}
                className="p-2 rounded-lg hover:bg-secondary"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
              <button
                onClick={handleSaveProfile}
                className="p-2 rounded-lg hover:bg-secondary"
              >
                <Check className="w-5 h-5 text-primary" />
              </button>
            </>
          ) : (
            <>
              {userIsAdmin && (
                <button
                  onClick={() => router.push("/admin")}
                  className="p-2 rounded-lg hover:bg-secondary"
                >
                  <Shield className="w-5 h-5 text-primary" />
                </button>
              )}
              <button
                onClick={() => setEditing(true)}
                className="p-2 rounded-lg hover:bg-secondary"
              >
                <Edit3 className="w-5 h-5 text-muted-foreground" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-secondary"
              >
                <LogOut className="w-5 h-5 text-muted-foreground" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Profile Info */}
      <div className="flex flex-col items-center py-6 gap-4">
        {/* Avatar */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-secondary border-2 border-primary overflow-hidden flex items-center justify-center">
            {profile?.photoURL ? (
              <img
                src={profile.photoURL}
                alt={profile.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-10 h-10 text-muted-foreground" />
            )}
          </div>
          <button
            onClick={() => photoInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="absolute bottom-0 left-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center"
          >
            <Camera className="w-3.5 h-3.5 text-primary-foreground" />
          </button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
        </div>

        {/* Name & Bio */}
        {editing ? (
          <div className="flex flex-col items-center gap-2 w-full px-8">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-secondary border border-input rounded-lg py-2 px-3 text-foreground text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="نام"
            />
            <textarea
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              className="w-full bg-secondary border border-input rounded-lg py-2 px-3 text-foreground text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring resize-none h-16"
              placeholder="بائیو لکھیں..."
              maxLength={150}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <h2 className="text-foreground font-bold text-lg">
              {profile?.displayName || "User"}
            </h2>
            {profile?.bio && (
              <p className="text-muted-foreground text-sm max-w-xs text-center">
                {profile.bio}
              </p>
            )}
            <p className="text-muted-foreground text-xs mt-1">
              {profile?.email || profile?.phoneNumber}
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-8 mt-2">
          <div className="flex flex-col items-center">
            <span className="text-foreground font-bold text-lg">{statuses.length}</span>
            <span className="text-muted-foreground text-xs">سٹیٹس</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-foreground font-bold text-lg">{totalLikes}</span>
            <span className="text-muted-foreground text-xs">لائکس</span>
          </div>
        </div>
      </div>

      {/* Status Grid */}
      <div className="border-t border-border">
        <div className="flex items-center justify-center gap-2 py-3">
          <Grid3X3 className="w-4 h-4 text-foreground" />
          <span className="text-foreground text-sm font-medium">میری سٹیٹس</span>
        </div>

        {statuses.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
              <Camera className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">ابھی کوئی سٹیٹس نہیں</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5 px-0.5">
            {statuses.map((s) => (
              <div
                key={s.id}
                className="aspect-square bg-card relative overflow-hidden"
              >
                {s.type === "video" ? (
                  <video
                    src={s.url}
                    className="w-full h-full object-cover"
                    muted
                  />
                ) : (
                  <img
                    src={s.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute bottom-1 right-1 bg-background/60 px-1.5 py-0.5 rounded text-[10px] text-foreground flex items-center gap-0.5">
                  <Heart className="w-2.5 h-2.5" /> {s.likes}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Credit Footer */}
      <div className="p-4 text-center border-t border-border">
        <p className="text-[10px] text-muted-foreground">
          Created By <span className="text-foreground font-medium">Muhammad Hussain Shakir</span>
        </p>
      </div>
    </div>
  );
}
