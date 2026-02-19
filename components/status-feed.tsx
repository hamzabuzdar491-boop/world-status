"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  db,
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from "@/lib/firebase";
import { isStatusExpired } from "@/lib/utils";
import { StatusCard } from "./status-card";
import { Loader2 } from "lucide-react";

interface StatusData {
  id: string;
  url: string;
  type: "image" | "video";
  songUrl?: string;
  songName?: string;
  caption?: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  likes: number;
  commentCount: number;
  createdAt: Date;
}

export function StatusFeed() {
  const [statuses, setStatuses] = useState<StatusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, "statuses"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, (snapshot) => {
      const items: StatusData[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const createdAt = data.createdAt instanceof Timestamp
          ? data.createdAt.toDate()
          : new Date();

        // Only show statuses that are not expired (48 hours)
        if (!isStatusExpired(createdAt)) {
          items.push({
            id: docSnap.id,
            url: data.url,
            type: data.type || "image",
            songUrl: data.songUrl || "",
            songName: data.songName || "",
            caption: data.caption || "",
            userId: data.userId,
            userName: data.userName || "User",
            userPhoto: data.userPhoto || "",
            likes: data.likes || 0,
            commentCount: data.commentCount || 0,
            createdAt,
          });
        }
      });
      setStatuses(items);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;
    const height = containerRef.current.clientHeight;
    const index = Math.round(scrollTop / height);
    setActiveIndex(index);
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground text-sm">لوڈ ہو رہا ہے...</p>
        </div>
      </div>
    );
  }

  if (statuses.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center p-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <h3 className="text-foreground font-semibold">کوئی سٹیٹس نہیں</h3>
          <p className="text-muted-foreground text-sm">
            پہلی سٹیٹس لگانے والے بنیں!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-screen overflow-y-scroll snap-container scrollbar-hide"
      onScroll={handleScroll}
    >
      {statuses.map((status, index) => (
        <StatusCard
          key={status.id}
          status={status}
          isActive={index === activeIndex}
        />
      ))}
    </div>
  );
}
