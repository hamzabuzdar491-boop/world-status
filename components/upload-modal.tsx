"use client";

import { useState, useRef } from "react";
import { X, Upload, Image as ImageIcon, Video, Music, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  db,
  collection,
  addDoc,
  serverTimestamp,
  uploadToCloudinary,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET,
} from "@/lib/firebase";

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
}

export function UploadModal({ open, onClose }: UploadModalProps) {
  const { user, profile } = useAuth();
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>("");
  const [mediaType, setMediaType] = useState<"image" | "video" | "">("");
  const [songFile, setSongFile] = useState<File | null>(null);
  const [songName, setSongName] = useState("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const songInputRef = useRef<HTMLInputElement>(null);

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaFile(file);
    const type = file.type.startsWith("video") ? "video" : "image";
    setMediaType(type);

    const url = URL.createObjectURL(file);
    setMediaPreview(url);
  };

  const handleSongSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSongFile(file);
    setSongName(file.name);
  };

  const handleUpload = async () => {
    if (!mediaFile || !user) return;

    setUploading(true);
    setProgress(10);

    try {
      // Upload media to Cloudinary
      setProgress(30);
      const mediaResult = await uploadToCloudinary(mediaFile);
      setProgress(60);

      // Upload song to Cloudinary if exists
      let songUrl = "";
      if (songFile) {
        const songFormData = new FormData();
        songFormData.append("file", songFile);
        songFormData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

        const songRes = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
          { method: "POST", body: songFormData }
        );
        const songData = await songRes.json();
        songUrl = songData.secure_url;
      }
      setProgress(80);

      // Save to Firestore
      await addDoc(collection(db, "statuses"), {
        url: mediaResult.url,
        type: mediaResult.type === "video" ? "video" : "image",
        songUrl: songUrl,
        songName: songName,
        caption: caption,
        userId: user.uid,
        userName: profile?.displayName || "User",
        userPhoto: profile?.photoURL || "",
        likes: 0,
        commentCount: 0,
        createdAt: serverTimestamp(),
      });

      setProgress(100);

      // Reset and close
      setTimeout(() => {
        resetForm();
        onClose();
      }, 500);
    } catch (err) {
      console.error("Upload error:", err);
      alert("اپلوڈ میں مسئلہ ہوا!");
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setMediaFile(null);
    setMediaPreview("");
    setMediaType("");
    setSongFile(null);
    setSongName("");
    setCaption("");
    setProgress(0);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button onClick={() => { resetForm(); onClose(); }} className="text-muted-foreground hover:text-foreground">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-foreground font-semibold">نئی سٹیٹس</h2>
        <button
          onClick={handleUpload}
          disabled={!mediaFile || uploading}
          className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-medium disabled:opacity-50"
        >
          {uploading ? "اپلوڈ..." : "شیئر"}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
        {/* Media Preview */}
        {mediaPreview ? (
          <div className="relative w-full aspect-[9/16] max-h-[50vh] bg-card rounded-xl overflow-hidden">
            {mediaType === "video" ? (
              <video
                src={mediaPreview}
                className="w-full h-full object-contain"
                controls
                playsInline
              />
            ) : (
              <img
                src={mediaPreview}
                alt="Preview"
                className="w-full h-full object-contain"
              />
            )}
            <button
              onClick={() => { setMediaFile(null); setMediaPreview(""); setMediaType(""); }}
              className="absolute top-2 left-2 bg-background/60 p-1.5 rounded-full"
            >
              <X className="w-4 h-4 text-foreground" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => mediaInputRef.current?.click()}
            className="w-full aspect-[9/16] max-h-[40vh] bg-card border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-3 hover:border-primary/50 transition-colors"
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <p className="text-muted-foreground text-sm">تصویر یا ویڈیو منتخب کریں</p>
            <div className="flex gap-2">
              <span className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
                <ImageIcon className="w-3 h-3" /> تصویر
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
                <Video className="w-3 h-3" /> ویڈیو
              </span>
            </div>
          </button>
        )}

        <input
          ref={mediaInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleMediaSelect}
          className="hidden"
        />

        {/* Caption */}
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="کیپشن لکھیں..."
          maxLength={200}
          className="w-full bg-card border border-border rounded-xl py-3 px-4 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none h-20"
        />

        {/* Song Selection */}
        <button
          onClick={() => songInputRef.current?.click()}
          className="flex items-center gap-3 bg-card border border-border rounded-xl py-3 px-4 hover:border-primary/30 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Music className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 text-right">
            {songName ? (
              <p className="text-foreground text-sm truncate">{songName}</p>
            ) : (
              <p className="text-muted-foreground text-sm">گانا شامل کریں (اختیاری)</p>
            )}
          </div>
          {songName && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSongFile(null);
                setSongName("");
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </button>
        <input
          ref={songInputRef}
          type="file"
          accept="audio/*"
          onChange={handleSongSelect}
          className="hidden"
        />

        {/* Upload Progress */}
        {uploading && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>اپلوڈ ہو رہا ہے... {progress}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
