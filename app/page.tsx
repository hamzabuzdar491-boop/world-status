"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { StatusFeed } from "@/components/status-feed";
import { BottomNav } from "@/components/bottom-nav";
import { UploadModal } from "@/components/upload-modal";
import { ProfileView } from "@/components/profile-view";
import { SearchView } from "@/components/search-view";
import { ActivityView } from "@/components/activity-view";
import { Globe, Loader2 } from "lucide-react";

type Tab = "home" | "search" | "upload" | "activity" | "profile";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const handleTabChange = (tab: Tab) => {
    if (tab === "upload") {
      setShowUpload(true);
      return;
    }
    setActiveTab(tab);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Globe className="w-8 h-8 text-primary" />
        </div>
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <p className="text-muted-foreground text-sm">World Status</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-background">
      {/* Top Header (only on home) */}
      {activeTab === "home" && (
        <div className="fixed top-0 left-0 right-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              <h1 className="text-foreground font-bold text-base">World Status</h1>
            </div>
            <span className="text-[9px] text-muted-foreground">By M. Hussain Shakir</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className={activeTab === "home" ? "" : ""}>
        {activeTab === "home" && <StatusFeed />}
        {activeTab === "search" && <SearchView />}
        {activeTab === "activity" && <ActivityView />}
        {activeTab === "profile" && <ProfileView />}
      </div>

      {/* Upload Modal */}
      <UploadModal open={showUpload} onClose={() => setShowUpload(false)} />

      {/* Bottom Navigation */}
      <BottomNav active={activeTab} onChange={handleTabChange} />
    </main>
  );
}
