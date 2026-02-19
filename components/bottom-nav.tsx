"use client";

import { Home, Search, Plus, Heart, User } from "lucide-react";

type Tab = "home" | "search" | "upload" | "activity" | "profile";

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

export function BottomNav({ active, onChange }: BottomNavProps) {
  const tabs: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: "home", icon: <Home className="w-5 h-5" />, label: "ہوم" },
    { id: "search", icon: <Search className="w-5 h-5" />, label: "تلاش" },
    { id: "upload", icon: <Plus className="w-5 h-5" />, label: "" },
    { id: "activity", icon: <Heart className="w-5 h-5" />, label: "سرگرمی" },
    { id: "profile", icon: <User className="w-5 h-5" />, label: "پروفائل" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around py-2 pb-[env(safe-area-inset-bottom,8px)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 transition-colors ${
              tab.id === "upload" ? "" : active === tab.id ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {tab.id === "upload" ? (
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center -mt-3 shadow-lg shadow-primary/30">
                <Plus className="w-5 h-5 text-primary-foreground" />
              </div>
            ) : (
              <>
                {tab.icon}
                <span className="text-[10px]">{tab.label}</span>
              </>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
