"use client";

import { useEffect, useState } from "react";
import { Heart, MessageCircle, User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  db,
  collection,
  query,
  orderBy,
  getDocs,
  Timestamp,
} from "@/lib/firebase";
import { onSnapshot } from "firebase/firestore";
import { timeAgo } from "@/lib/utils";

interface Activity {
  id: string;
  type: "like" | "comment";
  userName: string;
  userPhoto: string;
  statusUrl: string;
  statusType: string;
  text?: string;
  createdAt: Date;
}

export function ActivityView() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Get all statuses, filter for user's statuses client-side
    const q = query(collection(db, "statuses"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(
      q,
      async (statusSnap) => {
        const allActivities: Activity[] = [];

        // Filter to user's statuses client-side
        const userStatuses = statusSnap.docs.filter((d) => d.data().userId === user.uid);

        for (const statusDoc of userStatuses) {
          const statusData = statusDoc.data();

          // Get likes - simple getDocs without where to avoid composite index
          try {
            const likesSnap = await getDocs(collection(db, "statuses", statusDoc.id, "likes"));
            likesSnap.forEach((likeDoc) => {
              const likeData = likeDoc.data();
              if (likeData.userId !== user.uid) {
                allActivities.push({
                  id: likeDoc.id,
                  type: "like",
                  userName: likeData.userName || "User",
                  userPhoto: likeData.userPhoto || "",
                  statusUrl: statusData.url,
                  statusType: statusData.type,
                  createdAt: likeData.createdAt instanceof Timestamp
                    ? likeData.createdAt.toDate()
                    : new Date(),
                });
              }
            });
          } catch {
            // Permission or index issue - skip
          }

          // Get comments
          try {
            const commentsSnap = await getDocs(collection(db, "statuses", statusDoc.id, "comments"));
            commentsSnap.forEach((commentDoc) => {
              const commentData = commentDoc.data();
              if (commentData.userId !== user.uid) {
                allActivities.push({
                  id: commentDoc.id,
                  type: "comment",
                  userName: commentData.userName || "User",
                  userPhoto: commentData.userPhoto || "",
                  statusUrl: statusData.url,
                  statusType: statusData.type,
                  text: commentData.text,
                  createdAt: commentData.createdAt instanceof Timestamp
                    ? commentData.createdAt.toDate()
                    : new Date(),
                });
              }
            });
          } catch {
            // Permission or index issue - skip
          }
        }

        allActivities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setActivities(allActivities.slice(0, 50));
        setLoading(false);
      },
      (error) => {
        console.error("Activity error:", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background p-4 border-b border-border">
        <h1 className="text-foreground font-bold text-lg">سرگرمی</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <p className="text-muted-foreground text-sm">لوڈ ہو رہا ہے...</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
            <Heart className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">ابھی کوئی سرگرمی نہیں</p>
        </div>
      ) : (
        <div className="p-4 flex flex-col gap-3">
          {activities.map((a) => (
            <div key={a.id} className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border">
              <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden flex items-center justify-center flex-shrink-0">
                {a.userPhoto ? (
                  <img src={a.userPhoto} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-foreground text-sm">
                  <span className="font-semibold">{a.userName}</span>{" "}
                  {a.type === "like" ? "نے آپ کی سٹیٹس لائک کی" : "نے تبصرہ کیا"}
                </p>
                {a.text && <p className="text-muted-foreground text-xs truncate mt-0.5">{a.text}</p>}
                <p className="text-muted-foreground text-xs mt-0.5">{timeAgo(a.createdAt)}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                {a.statusType === "video" ? (
                  <video src={a.statusUrl} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={a.statusUrl} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${a.type === "like" ? "bg-primary/10" : "bg-blue-500/10"}`}>
                {a.type === "like" ? (
                  <Heart className="w-3 h-3 text-primary" />
                ) : (
                  <MessageCircle className="w-3 h-3 text-blue-400" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
