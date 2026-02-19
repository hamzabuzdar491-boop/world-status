import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "ابھی ابھی";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} منٹ پہلے`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} گھنٹے پہلے`;
  return `${Math.floor(seconds / 86400)} دن پہلے`;
}

export function isStatusExpired(createdAt: Date): boolean {
  const now = new Date();
  const diff = now.getTime() - createdAt.getTime();
  const hours48 = 48 * 60 * 60 * 1000;
  return diff > hours48;
}
