"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  auth,
  db,
  googleProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
  doc,
  getDoc,
} from "@/lib/firebase";
import { setDoc } from "firebase/firestore";
import { Globe, Mail, Phone, Eye, EyeOff } from "lucide-react";

type AuthTab = "login" | "signup" | "phone" | "forgot";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<AuthTab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Phone auth states
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmResult, setConfirmResult] = useState<unknown>(null);
  const [phoneStep, setPhoneStep] = useState<"number" | "otp">("number");

  const handleError = (err: unknown) => {
    const error = err as { code?: string };
    switch (error.code) {
      case "auth/user-not-found":
        return "یہ ای میل رجسٹرڈ نہیں ہے";
      case "auth/wrong-password":
        return "غلط پاسورڈ";
      case "auth/email-already-in-use":
        return "یہ ای میل پہلے سے استعمال ہو رہی ہے";
      case "auth/weak-password":
        return "پاسورڈ کم از کم 6 حروف کا ہونا چاہیے";
      case "auth/invalid-email":
        return "غلط ای میل ایڈریس";
      case "auth/invalid-credential":
        return "غلط ای میل یا پاسورڈ";
      case "auth/too-many-requests":
        return "بہت زیادہ کوششیں - تھوڑی دیر بعد دوبارہ کوشش کریں";
      default:
        return "کچھ غلط ہو گیا، دوبارہ کوشش کریں";
    }
  };

  const createUserProfile = async (uid: string, data: Record<string, unknown>) => {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        ...data,
        createdAt: new Date(),
        bio: "",
      });
    }
  };

  const handleEmailLogin = async () => {
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch (err) {
      setError(handleError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignup = async () => {
    setLoading(true);
    setError("");
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      await createUserProfile(cred.user.uid, {
        displayName: name,
        email: email,
        photoURL: null,
        phoneNumber: null,
      });
      router.push("/");
    } catch (err) {
      setError(handleError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await createUserProfile(result.user.uid, {
        displayName: result.user.displayName,
        email: result.user.email,
        photoURL: result.user.photoURL,
        phoneNumber: result.user.phoneNumber,
      });
      router.push("/");
    } catch (err) {
      setError(handleError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess("پاسورڈ ری سیٹ لنک آپ کی ای میل پر بھیج دیا گیا ہے");
    } catch (err) {
      setError(handleError(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSendOtp = async () => {
    setLoading(true);
    setError("");
    try {
      const { RecaptchaVerifier, signInWithPhoneNumber } = await import("@/lib/firebase");

      const existingContainer = document.getElementById("recaptcha-container");
      if (existingContainer) existingContainer.innerHTML = "";

      const recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
      });

      const confirmation = await signInWithPhoneNumber(
        auth,
        phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}`,
        recaptchaVerifier
      );
      setConfirmResult(confirmation);
      setPhoneStep("otp");
    } catch (err) {
      setError(handleError(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneVerifyOtp = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await (confirmResult as { confirm: (otp: string) => Promise<{ user: { uid: string; displayName: string | null; email: string | null; phoneNumber: string | null; photoURL: string | null } }> }).confirm(otp);
      await createUserProfile(result.user.uid, {
        displayName: result.user.displayName || "User",
        email: result.user.email,
        photoURL: result.user.photoURL,
        phoneNumber: result.user.phoneNumber,
      });
      router.push("/");
    } catch {
      setError("غلط OTP کوڈ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Globe className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">World Status</h1>
          <p className="text-muted-foreground text-sm">ورلڈ سٹیٹس میں خوش آمدید</p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-xl border border-border p-6">
          {/* Tabs */}
          {tab !== "forgot" && (
            <div className="flex gap-1 bg-secondary rounded-lg p-1 mb-6">
              <button
                onClick={() => { setTab("login"); setError(""); }}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  tab === "login"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                لاگ ان
              </button>
              <button
                onClick={() => { setTab("signup"); setError(""); }}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  tab === "signup"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                سائن اپ
              </button>
              <button
                onClick={() => { setTab("phone"); setError(""); setPhoneStep("number"); }}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  tab === "phone"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Phone className="w-4 h-4 mx-auto" />
              </button>
            </div>
          )}

          {/* Error / Success */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-3 mb-4 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg p-3 mb-4 text-sm">
              {success}
            </div>
          )}

          {/* Login Form */}
          {tab === "login" && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">ای میل</label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    dir="ltr"
                    className="w-full bg-secondary border border-input rounded-lg py-2.5 pr-10 pl-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">پاسورڈ</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="پاسورڈ درج کریں"
                    dir="ltr"
                    className="w-full bg-secondary border border-input rounded-lg py-2.5 pr-3 pl-10 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <button
                onClick={() => { setTab("forgot"); setError(""); setSuccess(""); }}
                className="text-primary text-xs self-start hover:underline"
              >
                پاسورڈ بھول گئے؟
              </button>
              <button
                onClick={handleEmailLogin}
                disabled={loading || !email || !password}
                className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "لاگ ان ہو رہا ہے..." : "لاگ ان"}
              </button>
            </div>
          )}

          {/* Signup Form */}
          {tab === "signup" && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">نام</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="اپنا نام لکھیں"
                  className="w-full bg-secondary border border-input rounded-lg py-2.5 px-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">ای میل</label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    dir="ltr"
                    className="w-full bg-secondary border border-input rounded-lg py-2.5 pr-10 pl-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">پاسورڈ</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="کم از کم 6 حروف"
                    dir="ltr"
                    className="w-full bg-secondary border border-input rounded-lg py-2.5 pr-3 pl-10 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <button
                onClick={handleEmailSignup}
                disabled={loading || !email || !password || !name}
                className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "سائن اپ ہو رہا ہے..." : "سائن اپ"}
              </button>
            </div>
          )}

          {/* Phone Form */}
          {tab === "phone" && (
            <div className="flex flex-col gap-4">
              {phoneStep === "number" ? (
                <>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1.5">
                      فون نمبر (ملکی کوڈ کے ساتھ)
                    </label>
                    <div className="relative">
                      <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+92300XXXXXXX"
                        dir="ltr"
                        className="w-full bg-secondary border border-input rounded-lg py-2.5 pr-10 pl-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handlePhoneSendOtp}
                    disabled={loading || !phoneNumber}
                    className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "بھیجا جا رہا ہے..." : "OTP بھیجیں"}
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1.5">
                      OTP کوڈ درج کریں
                    </label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="123456"
                      dir="ltr"
                      maxLength={6}
                      className="w-full bg-secondary border border-input rounded-lg py-2.5 px-3 text-foreground text-sm text-center tracking-widest placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <button
                    onClick={handlePhoneVerifyOtp}
                    disabled={loading || otp.length < 6}
                    className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "تصدیق ہو رہی ہے..." : "تصدیق کریں"}
                  </button>
                  <button
                    onClick={() => setPhoneStep("number")}
                    className="text-muted-foreground text-xs hover:text-foreground"
                  >
                    واپس جائیں
                  </button>
                </>
              )}
              <div id="recaptcha-container" />
            </div>
          )}

          {/* Forgot Password Form */}
          {tab === "forgot" && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-foreground">پاسورڈ ری سیٹ</h2>
              <p className="text-sm text-muted-foreground">
                اپنی ای میل درج کریں، ہم آپ کو ری سیٹ لنک بھیجیں گے
              </p>
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">ای میل</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  dir="ltr"
                  className="w-full bg-secondary border border-input rounded-lg py-2.5 px-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <button
                onClick={handleForgotPassword}
                disabled={loading || !email}
                className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "بھیجا جا رہا ہے..." : "ری سیٹ لنک بھیجیں"}
              </button>
              <button
                onClick={() => { setTab("login"); setError(""); setSuccess(""); }}
                className="text-muted-foreground text-xs hover:text-foreground"
              >
                لاگ ان پر واپس جائیں
              </button>
            </div>
          )}

          {/* Google Divider */}
          {tab !== "forgot" && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">یا</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Google Login */}
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-secondary border border-border py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                گوگل سے لاگ ان
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
