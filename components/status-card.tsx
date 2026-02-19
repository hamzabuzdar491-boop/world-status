"use client";

import { useState, useRef, useEffect } from "react";
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Music, User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  db,
  doc,
  updateDoc,
  increment,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  onSnapshot,
  orderBy,
} from "@/lib/firebase";
import { timeAgo } from "@/lib/utils";

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

interface Comment {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  createdAt: Date;
}

export function StatusCard({
  status,
  isActive,
}: {
  status: StatusData;
  isActive: boolean;
}) {
  const { user, profile } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(status.likes);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentCount, setCommentCount] = useState(status.commentCount);
  const [doubleTapLike, setDoubleTapLike] = useState(false);
  const lastTapRef = useRef(0);

  // Handle video play/pause based on visibility
  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
    if (audioRef.current) {
      if (isActive) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [isActive]);

  // Check if user already liked
  useEffect(() => {
    if (!user) return;
    const checkLike = async () => {
      const q = query(
        collection(db, "statuses", status.id, "likes"),
        where("userId", "==", user.uid)
      );
      const snap = await getDocs(q);
      setLiked(!snap.empty);
    };
    checkLike();
  }, [user, status.id]);

  // Load comments when opened
  useEffect(() => {
    if (!showComments) return;
    const q = query(
      collection(db, "statuses", status.id, "comments"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const cmts: Comment[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Comment, "id" | "createdAt">),
        createdAt: d.data().createdAt?.toDate() || new Date(),
      }));
      setComments(cmts);
      setCommentCount(cmts.length);
    });
    return () => unsub();
  }, [showComments, status.id]);

  const handleLike = async () => {
    if (!user) return;

    if (liked) {
      // Unlike
      const q = query(
        collection(db, "statuses", status.id, "likes"),
        where("userId", "==", user.uid)
      );
      const snap = await getDocs(q);
      snap.forEach((d) => deleteDoc(d.ref));
      await updateDoc(doc(db, "statuses", status.id), { likes: increment(-1) });
      setLiked(false);
      setLikeCount((p) => p - 1);
    } else {
      // Like
      await addDoc(collection(db, "statuses", status.id, "likes"), {
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "statuses", status.id), { likes: increment(1) });
      setLiked(true);
      setLikeCount((p) => p + 1);
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!liked) handleLike();
      setDoubleTapLike(true);
      setTimeout(() => setDoubleTapLike(false), 800);
    }
    lastTapRef.current = now;
  };

  const handleAddComment = async () => {
    if (!user || !newComment.trim()) return;
    await addDoc(collection(db, "statuses", status.id, "comments"), {
      text: newComment.trim(),
      userId: user.uid,
      userName: profile?.displayName || "User",
      userPhoto: profile?.photoURL || "",
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "statuses", status.id), { commentCount: increment(1) });
    setNewComment("");
  };

  const toggleMute = () => {
    setMuted(!muted);
    if (videoRef.current) videoRef.current.muted = !muted;
    if (audioRef.current) audioRef.current.muted = !muted;
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: "World Status",
        text: status.caption || "دیکھیں یہ سٹیٹس!",
        url: window.location.href,
      });
    } catch {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div
      className="h-screen w-full snap-item relative bg-background flex items-center justify-center"
      onClick={handleDoubleTap}
    >
      {/* Media */}
      {status.type === "video" ? (
        <video
          ref={videoRef}
          src={status.url}
          className="h-full w-full object-contain"
          loop
          muted={muted}
          playsInline
          preload="auto"
        />
      ) : (
        <img
          src={status.url}
          alt={status.caption || "Status"}
          className="h-full w-full object-contain"
        />
      )}

      {/* Song audio (for image statuses with music) */}
      {status.songUrl && (
        <audio ref={audioRef} src={status.songUrl} loop muted={muted} />
      )}

      {/* Double tap heart animation */}
      {doubleTapLike && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <Heart className="w-24 h-24 text-primary fill-primary animate-ping" />
        </div>
      )}

      {/* Bottom gradient overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-60 bg-gradient-to-t from-background/90 to-transparent pointer-events-none" />

      {/* User info & caption (bottom left / bottom right for RTL) */}
      <div className="absolute bottom-20 right-4 left-16 z-10">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-secondary border border-border overflow-hidden flex-shrink-0">
            {status.userPhoto ? (
              <img
                src={status.userPhoto}
                alt={status.userName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </div>
          <span className="text-foreground text-sm font-semibold">{status.userName}</span>
          <span className="text-muted-foreground text-xs">{timeAgo(status.createdAt)}</span>
        </div>
        {status.caption && (
          <p className="text-foreground text-sm leading-relaxed mb-2">{status.caption}</p>
        )}
        {status.songName && (
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <Music className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "3s" }} />
            <span className="truncate max-w-48">{status.songName}</span>
          </div>
        )}
      </div>

      {/* Action buttons (right side / left side for RTL) */}
      <div className="absolute bottom-24 left-3 flex flex-col items-center gap-5 z-10">
        {/* Like */}
        <button onClick={handleLike} className="flex flex-col items-center gap-1">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${liked ? "bg-primary/20" : "bg-background/40"}`}>
            <Heart
              className={`w-5 h-5 transition-colors ${liked ? "text-primary fill-primary" : "text-foreground"}`}
            />
          </div>
          <span className="text-foreground text-xs">{likeCount}</span>
        </button>

        {/* Comment */}
        <button
          onClick={(e) => { e.stopPropagation(); setShowComments(true); }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-10 h-10 rounded-full bg-background/40 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-foreground" />
          </div>
          <span className="text-foreground text-xs">{commentCount}</span>
        </button>

        {/* Share */}
        <button onClick={handleShare} className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full bg-background/40 flex items-center justify-center">
            <Share2 className="w-5 h-5 text-foreground" />
          </div>
        </button>

        {/* Mute/Unmute */}
        {(status.type === "video" || status.songUrl) && (
          <button onClick={toggleMute} className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-background/40 flex items-center justify-center">
              {muted ? (
                <VolumeX className="w-5 h-5 text-foreground" />
              ) : (
                <Volume2 className="w-5 h-5 text-foreground" />
              )}
            </div>
          </button>
        )}
      </div>

      {/* Comments Sheet */}
      {showComments && (
        <div
          className="absolute inset-0 z-40"
          onClick={(e) => {
            e.stopPropagation();
            setShowComments(false);
          }}
        >
          <div className="absolute bottom-0 left-0 right-0 bg-card border-t border-border rounded-t-2xl max-h-[60vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center py-2">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="px-4 pb-2 border-b border-border">
              <h3 className="text-foreground font-semibold text-sm">
                تبصرے ({commentCount})
              </h3>
            </div>

            {/* Comments list */}
            <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
              {comments.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-8">
                  ابھی کوئی تبصرہ نہیں ہے
                </p>
              )}
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-secondary flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {c.userPhoto ? (
                      <img src={c.userPhoto} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground text-xs font-semibold">{c.userName}</span>
                      <span className="text-muted-foreground text-xs">{timeAgo(c.createdAt)}</span>
                    </div>
                    <p className="text-foreground text-sm mt-0.5">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Add comment */}
            <div className="p-3 border-t border-border flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="تبصرہ لکھیں..."
                className="flex-1 bg-secondary border border-input rounded-full py-2 px-4 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium disabled:opacity-50"
              >
                بھیجیں
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
