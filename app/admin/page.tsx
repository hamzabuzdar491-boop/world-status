"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  db,
  collection,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  Timestamp,
} from "@/lib/firebase";
import { setDoc } from "firebase/firestore";
import {
  Shield,
  Trash2,
  Star,
  StarOff,
  Eye,
  Users,
  Film,
  BarChart3,
  User,
  ArrowRight,
  Heart,
  MessageCircle,
  Ban,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Search,
  Globe,
  Loader2,
  X,
  Settings,
  TrendingUp,
} from "lucide-react";
import { timeAgo } from "@/lib/utils";

// Admin UID - set this to your Firebase Auth UID
const ADMIN_UIDS = ["ADMIN"]; // Will check Firestore for admin role

interface StatusItem {
  id: string;
  url: string;
  type: "image" | "video";
  caption: string;
  userId: string;
  userName: string;
  userPhoto: string;
  likes: number;
  commentCount: number;
  views: number;
  featured: boolean;
  hidden: boolean;
  createdAt: Date;
}

interface UserItem {
  uid: string;
  displayName: string;
  email: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
  bio: string;
  banned: boolean;
  isAdmin: boolean;
  createdAt: Date;
  statusCount?: number;
}

type AdminTab = "dashboard" | "statuses" | "users" | "foryou" | "settings";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "featured" | "hidden">("all");
  const [expandedStatus, setExpandedStatus] = useState<string | null>(null);
  const [editViews, setEditViews] = useState<{ id: string; views: number } | null>(null);

  // Check admin role
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    const checkAdmin = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.isAdmin === true) {
            setIsAdmin(true);
          } else {
            // First user auto-becomes admin if no admin exists
            const usersSnap = await getDocs(collection(db, "users"));
            let hasAdmin = false;
            usersSnap.forEach((d) => {
              if (d.data().isAdmin === true) hasAdmin = true;
            });
            if (!hasAdmin) {
              await updateDoc(doc(db, "users", user.uid), { isAdmin: true });
              setIsAdmin(true);
            } else {
              router.push("/");
            }
          }
        }
      } catch (err) {
        console.error("Admin check error:", err);
        router.push("/");
      } finally {
        setChecking(false);
      }
    };

    checkAdmin();
  }, [user, loading, router]);

  // Load statuses
  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, "statuses"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const items: StatusItem[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          url: data.url,
          type: data.type || "image",
          caption: data.caption || "",
          userId: data.userId,
          userName: data.userName || "User",
          userPhoto: data.userPhoto || "",
          likes: data.likes || 0,
          commentCount: data.commentCount || 0,
          views: data.views || 0,
          featured: data.featured || false,
          hidden: data.hidden || false,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
        };
      });
      setStatuses(items);
    });
    return () => unsub();
  }, [isAdmin]);

  // Load users
  useEffect(() => {
    if (!isAdmin) return;
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const items: UserItem[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          uid: d.id,
          displayName: data.displayName || "User",
          email: data.email || null,
          phoneNumber: data.phoneNumber || null,
          photoURL: data.photoURL || null,
          bio: data.bio || "",
          banned: data.banned || false,
          isAdmin: data.isAdmin || false,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date()),
        };
      });
      setUsers(items);
    });
    return () => unsub();
  }, [isAdmin]);

  // Actions
  const toggleFeatured = async (statusId: string, current: boolean) => {
    await updateDoc(doc(db, "statuses", statusId), { featured: !current });
  };

  const toggleHidden = async (statusId: string, current: boolean) => {
    await updateDoc(doc(db, "statuses", statusId), { hidden: !current });
  };

  const deleteStatus = async (statusId: string) => {
    if (confirm("کیا آپ واقعی اس سٹیٹس کو حذف کرنا چاہتے ہیں؟")) {
      await deleteDoc(doc(db, "statuses", statusId));
    }
  };

  const updateViews = async (statusId: string, views: number) => {
    await updateDoc(doc(db, "statuses", statusId), { views });
    setEditViews(null);
  };

  const toggleBanUser = async (uid: string, current: boolean) => {
    if (confirm(current ? "کیا آپ اس صارف کو ان بین کرنا چاہتے ہیں؟" : "کیا آپ اس صارف کو بین کرنا چاہتے ہیں؟")) {
      await updateDoc(doc(db, "users", uid), { banned: !current });
    }
  };

  const toggleAdminRole = async (uid: string, current: boolean) => {
    if (confirm(current ? "ایڈمن رول ہٹائیں؟" : "ایڈمن رول دیں؟")) {
      await updateDoc(doc(db, "users", uid), { isAdmin: !current });
    }
  };

  // Stats
  const totalViews = statuses.reduce((s, st) => s + st.views, 0);
  const totalLikes = statuses.reduce((s, st) => s + st.likes, 0);
  const featuredCount = statuses.filter((s) => s.featured).length;
  const hiddenCount = statuses.filter((s) => s.hidden).length;

  // Filtered statuses
  const filteredStatuses = statuses.filter((s) => {
    if (statusFilter === "featured") return s.featured;
    if (statusFilter === "hidden") return s.hidden;
    return true;
  }).filter((s) =>
    searchQuery
      ? s.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.caption.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  // Filtered users
  const filteredUsers = users.filter((u) =>
    searchQuery
      ? u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()))
      : true
  );

  if (loading || checking) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Shield className="w-10 h-10 text-primary" />
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <p className="text-muted-foreground text-sm">ایڈمن پینل لوڈ ہو رہا ہے...</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-foreground font-bold text-base">Admin Panel</h1>
          </div>
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm"
          >
            <Globe className="w-4 h-4" />
            <span>ایپ</span>
          </button>
        </div>

        {/* Tab Nav */}
        <div className="flex overflow-x-auto scrollbar-hide gap-1 px-3 pb-2">
          {([
            { id: "dashboard" as AdminTab, label: "ڈیش بورڈ", icon: <BarChart3 className="w-4 h-4" /> },
            { id: "statuses" as AdminTab, label: "سٹیٹس", icon: <Film className="w-4 h-4" /> },
            { id: "users" as AdminTab, label: "صارفین", icon: <Users className="w-4 h-4" /> },
            { id: "foryou" as AdminTab, label: "For You", icon: <Star className="w-4 h-4" /> },
            { id: "settings" as AdminTab, label: "سیٹنگز", icon: <Settings className="w-4 h-4" /> },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearchQuery(""); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <div className="p-4 pb-8">
        {/* DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="flex flex-col gap-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Film className="w-4 h-4" />
                  <span className="text-xs">کل سٹیٹس</span>
                </div>
                <span className="text-2xl font-bold text-foreground">{statuses.length}</span>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span className="text-xs">کل صارفین</span>
                </div>
                <span className="text-2xl font-bold text-foreground">{users.length}</span>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Eye className="w-4 h-4" />
                  <span className="text-xs">کل ویوز</span>
                </div>
                <span className="text-2xl font-bold text-foreground">{totalViews.toLocaleString()}</span>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Heart className="w-4 h-4" />
                  <span className="text-xs">کل لائکس</span>
                </div>
                <span className="text-2xl font-bold text-foreground">{totalLikes.toLocaleString()}</span>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-primary">
                  <Star className="w-4 h-4" />
                  <span className="text-xs">فیچرڈ</span>
                </div>
                <span className="text-2xl font-bold text-foreground">{featuredCount}</span>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-destructive">
                  <Ban className="w-4 h-4" />
                  <span className="text-xs">ہائیڈن</span>
                </div>
                <span className="text-2xl font-bold text-foreground">{hiddenCount}</span>
              </div>
            </div>

            {/* Recent Statuses */}
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-foreground font-semibold text-sm mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                حالیہ سٹیٹس
              </h3>
              <div className="flex flex-col gap-2">
                {statuses.slice(0, 5).map((s) => (
                  <div key={s.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <div className="w-10 h-10 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                      {s.type === "video" ? (
                        <video src={s.url} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={s.url} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-xs font-medium truncate">{s.userName}</p>
                      <p className="text-muted-foreground text-[10px]">{timeAgo(s.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground text-xs">
                      <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" /> {s.views}</span>
                      <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" /> {s.likes}</span>
                    </div>
                    {s.featured && <Star className="w-3.5 h-3.5 text-primary fill-primary" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Top Users */}
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-foreground font-semibold text-sm mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                حالیہ صارفین
              </h3>
              <div className="flex flex-col gap-2">
                {users.slice(0, 5).map((u) => (
                  <div key={u.uid} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <div className="w-8 h-8 rounded-full bg-secondary overflow-hidden flex items-center justify-center flex-shrink-0">
                      {u.photoURL ? (
                        <img src={u.photoURL} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-xs font-medium">{u.displayName}</p>
                      <p className="text-muted-foreground text-[10px]">{u.email || u.phoneNumber}</p>
                    </div>
                    {u.banned && <span className="text-destructive text-[10px] bg-destructive/10 px-1.5 py-0.5 rounded">بین</span>}
                    {u.isAdmin && <Shield className="w-3.5 h-3.5 text-primary" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STATUSES MANAGEMENT */}
        {activeTab === "statuses" && (
          <div className="flex flex-col gap-4">
            {/* Search + Filter */}
            <div className="flex flex-col gap-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="سٹیٹس تلاش کریں..."
                  className="w-full bg-card border border-border rounded-xl py-2.5 pr-10 pl-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex gap-2">
                {(["all", "featured", "hidden"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      statusFilter === f
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {f === "all" ? "سب" : f === "featured" ? "فیچرڈ" : "ہائیڈن"}
                  </button>
                ))}
              </div>
            </div>

            {/* Status List */}
            <div className="flex flex-col gap-3">
              {filteredStatuses.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-sm">کوئی سٹیٹس نہیں ملی</p>
                </div>
              ) : (
                filteredStatuses.map((s) => (
                  <div
                    key={s.id}
                    className={`bg-card border rounded-xl overflow-hidden transition-colors ${
                      s.hidden ? "border-destructive/30 opacity-60" : s.featured ? "border-primary/40" : "border-border"
                    }`}
                  >
                    {/* Preview Row */}
                    <div className="flex items-center gap-3 p-3">
                      <div className="w-14 h-14 rounded-lg bg-secondary overflow-hidden flex-shrink-0 relative">
                        {s.type === "video" ? (
                          <video src={s.url} className="w-full h-full object-cover" muted />
                        ) : (
                          <img src={s.url} alt="" className="w-full h-full object-cover" />
                        )}
                        {s.type === "video" && (
                          <div className="absolute bottom-0.5 right-0.5 bg-background/70 rounded px-1 text-[8px] text-foreground">
                            ویڈیو
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-foreground text-sm font-medium">{s.userName}</span>
                          {s.featured && <Star className="w-3 h-3 text-primary fill-primary" />}
                          {s.hidden && <Ban className="w-3 h-3 text-destructive" />}
                        </div>
                        <p className="text-muted-foreground text-xs truncate">{s.caption || "بغیر کیپشن"}</p>
                        <div className="flex items-center gap-3 mt-1 text-muted-foreground text-[10px]">
                          <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" /> {s.views}</span>
                          <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" /> {s.likes}</span>
                          <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" /> {s.commentCount}</span>
                          <span>{timeAgo(s.createdAt)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setExpandedStatus(expandedStatus === s.id ? null : s.id)}
                        className="p-1.5 text-muted-foreground"
                      >
                        {expandedStatus === s.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Expanded Actions */}
                    {expandedStatus === s.id && (
                      <div className="border-t border-border p-3 flex flex-col gap-3">
                        {/* Views Editor */}
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground text-xs">ویوز:</span>
                          {editViews?.id === s.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="number"
                                value={editViews.views}
                                onChange={(e) => setEditViews({ id: s.id, views: parseInt(e.target.value) || 0 })}
                                className="w-24 bg-secondary border border-input rounded-lg py-1 px-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                dir="ltr"
                              />
                              <button
                                onClick={() => updateViews(s.id, editViews.views)}
                                className="bg-primary text-primary-foreground px-2 py-1 rounded-lg text-xs"
                              >
                                محفوظ
                              </button>
                              <button
                                onClick={() => setEditViews(null)}
                                className="text-muted-foreground"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditViews({ id: s.id, views: s.views })}
                              className="text-foreground text-sm font-medium hover:text-primary transition-colors"
                            >
                              {s.views.toLocaleString()} (ایڈٹ)
                            </button>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => toggleFeatured(s.id, s.featured)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              s.featured
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "bg-secondary text-muted-foreground border border-border"
                            }`}
                          >
                            {s.featured ? <StarOff className="w-3.5 h-3.5" /> : <Star className="w-3.5 h-3.5" />}
                            {s.featured ? "For You سے ہٹائیں" : "For You میں ڈالیں"}
                          </button>
                          <button
                            onClick={() => toggleHidden(s.id, s.hidden)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              s.hidden
                                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                : "bg-secondary text-muted-foreground border border-border"
                            }`}
                          >
                            {s.hidden ? <CheckCircle className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                            {s.hidden ? "ظاہر کریں" : "چھپائیں"}
                          </button>
                          <button
                            onClick={() => deleteStatus(s.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            حذف کریں
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* USERS MANAGEMENT */}
        {activeTab === "users" && (
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="صارف تلاش کریں..."
                className="w-full bg-card border border-border rounded-xl py-2.5 pr-10 pl-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex flex-col gap-3">
              {filteredUsers.map((u) => (
                <div
                  key={u.uid}
                  className={`bg-card border rounded-xl p-4 ${
                    u.banned ? "border-destructive/30 opacity-70" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-secondary overflow-hidden flex items-center justify-center flex-shrink-0">
                      {u.photoURL ? (
                        <img src={u.photoURL} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-foreground text-sm font-semibold">{u.displayName}</h3>
                        {u.isAdmin && (
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">ایڈمن</span>
                        )}
                        {u.banned && (
                          <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full">بین</span>
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs">{u.email || u.phoneNumber || "نامعلوم"}</p>
                      {u.bio && <p className="text-muted-foreground text-xs mt-0.5 truncate">{u.bio}</p>}
                    </div>
                  </div>

                  {/* User Actions */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => toggleBanUser(u.uid, u.banned)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        u.banned
                          ? "bg-green-500/10 text-green-400 border border-green-500/20"
                          : "bg-destructive/10 text-destructive border border-destructive/20"
                      }`}
                    >
                      {u.banned ? <CheckCircle className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                      {u.banned ? "ان بین" : "بین کریں"}
                    </button>
                    <button
                      onClick={() => toggleAdminRole(u.uid, u.isAdmin)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        u.isAdmin
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "bg-secondary text-muted-foreground border border-border"
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      {u.isAdmin ? "ایڈمن ہٹائیں" : "ایڈمن بنائیں"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FOR YOU MANAGEMENT */}
        {activeTab === "foryou" && (
          <div className="flex flex-col gap-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-foreground font-semibold text-sm mb-1">For You فیڈ</h3>
              <p className="text-muted-foreground text-xs mb-4">
                جو سٹیٹس آپ فیچرڈ کریں گے وہ سب سے پہلے For You فیڈ میں نظر آئیں گی۔
                ویوز بھی یہاں سے کنٹرول ہو سکتے ہیں۔
              </p>
            </div>

            {/* Featured Statuses */}
            <div>
              <h4 className="text-foreground font-semibold text-sm mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-primary" />
                فیچرڈ سٹیٹس ({featuredCount})
              </h4>
              {statuses.filter((s) => s.featured).length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-8 text-center">
                  <Star className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">
                    ابھی کوئی فیچرڈ سٹیٹس نہیں
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">
                    سٹیٹس ٹیب میں جا کر سٹیٹس کو For You میں ڈالیں
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {statuses.filter((s) => s.featured).map((s) => (
                    <div key={s.id} className="bg-card border border-primary/30 rounded-xl p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                          {s.type === "video" ? (
                            <video src={s.url} className="w-full h-full object-cover" muted />
                          ) : (
                            <img src={s.url} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground text-sm font-medium">{s.userName}</p>
                          <p className="text-muted-foreground text-xs truncate">{s.caption || "بغیر کیپشن"}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-muted-foreground text-[10px] flex items-center gap-0.5">
                              <Eye className="w-3 h-3" /> {s.views.toLocaleString()}
                            </span>
                            <span className="text-muted-foreground text-[10px] flex items-center gap-0.5">
                              <Heart className="w-3 h-3" /> {s.likes}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleFeatured(s.id, true)}
                          className="p-2 bg-primary/10 rounded-lg text-primary hover:bg-primary/20 transition-colors"
                        >
                          <StarOff className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Non-featured that can be added */}
            <div>
              <h4 className="text-foreground font-semibold text-sm mb-3">
                دستیاب سٹیٹس
              </h4>
              <div className="flex flex-col gap-2">
                {statuses.filter((s) => !s.featured && !s.hidden).map((s) => (
                  <div key={s.id} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                    <div className="w-12 h-12 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                      {s.type === "video" ? (
                        <video src={s.url} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={s.url} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-xs font-medium">{s.userName}</p>
                      <p className="text-muted-foreground text-[10px]">{s.likes} لائکس - {s.views} ویوز</p>
                    </div>
                    <button
                      onClick={() => toggleFeatured(s.id, false)}
                      className="p-2 bg-secondary rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {activeTab === "settings" && (
          <div className="flex flex-col gap-4">
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <Shield className="w-12 h-12 text-primary mx-auto mb-3" />
              <h2 className="text-foreground font-bold text-lg mb-1">World Status Admin</h2>
              <p className="text-muted-foreground text-sm mb-4">
                ایپ کی سیٹنگز اور معلومات
              </p>
              <div className="bg-secondary rounded-lg p-4 text-right">
                <p className="text-muted-foreground text-xs mb-1">ایڈمن:</p>
                <p className="text-foreground text-sm font-medium">{user?.displayName || user?.email}</p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-foreground font-semibold text-sm mb-3">ایپ کی معلومات</h3>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">ورژن</span>
                  <span className="text-foreground">1.0.0</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">پلیٹ فارم</span>
                  <span className="text-foreground">PWA - Next.js</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">ڈیٹا بیس</span>
                  <span className="text-foreground">Firebase Firestore</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">میڈیا سٹوریج</span>
                  <span className="text-foreground">Cloudinary</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">سٹیٹس مدت</span>
                  <span className="text-foreground">48 گھنٹے</span>
                </div>
              </div>
            </div>

            {/* Created By Credit */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
              <p className="text-primary text-sm font-bold">Created By</p>
              <p className="text-foreground text-lg font-bold mt-1">Muhammad Hussain Shakir</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
