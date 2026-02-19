"use client";

import { useState, useEffect } from "react";
import { Search, User } from "lucide-react";
import {
  db,
  collection,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from "@/lib/firebase";
import { onSnapshot } from "firebase/firestore";
import { isStatusExpired } from "@/lib/utils";

interface SearchUser {
  uid: string;
  displayName: string;
  photoURL: string | null;
  bio: string;
}

interface TrendingStatus {
  id: string;
  url: string;
  type: string;
  likes: number;
  userName: string;
}

export function SearchView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [trending, setTrending] = useState<TrendingStatus[]>([]);
  const [loading, setLoading] = useState(false);

  // Load trending statuses - sort client-side to avoid needing composite index
  useEffect(() => {
    const q = query(collection(db, "statuses"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: TrendingStatus[] = [];
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
              likes: data.likes || 0,
              userName: data.userName || "User",
            });
          }
        });
        // Sort by likes client-side
        items.sort((a, b) => b.likes - a.likes);
        setTrending(items.slice(0, 12));
      },
      (error) => {
        console.error("Trending error:", error);
      }
    );
    return () => unsub();
  }, []);

  // Search users
  useEffect(() => {
    if (!searchQuery.trim()) {
      setUsers([]);
      return;
    }

    const searchUsers = async () => {
      setLoading(true);
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const results: SearchUser[] = [];
        usersSnap.forEach((d) => {
          const data = d.data();
          if (data.displayName?.toLowerCase().includes(searchQuery.toLowerCase())) {
            results.push({
              uid: d.id,
              displayName: data.displayName,
              photoURL: data.photoURL,
              bio: data.bio || "",
            });
          }
        });
        setUsers(results);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="لوگوں کو تلاش کریں..."
            className="w-full bg-secondary border border-input rounded-xl py-2.5 pr-10 pl-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {searchQuery && (
        <div className="p-4">
          {loading ? (
            <p className="text-muted-foreground text-sm text-center py-4">تلاش ہو رہی ہے...</p>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">کوئی نتیجہ نہیں ملا</p>
          ) : (
            <div className="flex flex-col gap-3">
              {users.map((u) => (
                <div key={u.uid} className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border">
                  <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden flex items-center justify-center flex-shrink-0">
                    {u.photoURL ? (
                      <img src={u.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-foreground text-sm font-semibold">{u.displayName}</p>
                    {u.bio && <p className="text-muted-foreground text-xs truncate">{u.bio}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!searchQuery && (
        <div className="p-4">
          <h2 className="text-foreground font-semibold mb-3">ٹرینڈنگ</h2>
          {trending.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">ابھی کچھ ٹرینڈ نہیں ہو رہا</p>
          ) : (
            <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
              {trending.map((s) => (
                <div key={s.id} className="aspect-square relative bg-card overflow-hidden">
                  {s.type === "video" ? (
                    <video src={s.url} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={s.url} alt="" className="w-full h-full object-cover" />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/80 to-transparent p-1.5">
                    <p className="text-foreground text-[10px] truncate">{s.userName}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
