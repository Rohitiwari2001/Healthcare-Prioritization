"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useSession } from "@/features/auth/auth-context";
import { roleHome } from "@/lib/constants/enums";
import { useT } from "@/lib/i18n";
import { Lock, Mail, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const session = useSession();
  const { t, locale, setLocale } = useT();

  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // If already logged in, redirect to role home
  React.useEffect(() => {
    if (session.status === "ready") {
      if (session.mustChangePassword) {
        router.replace("/change-password");
      } else {
        router.replace(roleHome(session.role));
      }
    } else if (session.status === "noRole") {
      router.replace("/register/complete");
    }
  }, [session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
      );
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const tokenResult = await cred.user.getIdTokenResult();
      const role = tokenResult.claims.role as string | undefined;

      if (!role) {
        router.replace("/register/complete");
      }
    } catch (err: unknown) {
      console.error("Sign in failed:", err);
      setErrorMsg("Email or password is incorrect. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-pageBg">
      {/* Header */}
      <header className="border-b border-line-300 bg-surface px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-primary-700 flex items-center justify-center text-white font-bold text-lg">
            +
          </div>
          <span className="font-semibold text-xl text-ink-900 tracking-tight">
            {t("common.appName")}
          </span>
        </Link>

        <div className="text-sm font-medium border border-line-300 rounded-md p-1 bg-surface flex">
          <button
            onClick={() => setLocale("en")}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              locale === "en"
                ? "bg-primary-700 text-white font-semibold"
                : "text-ink-600 hover:text-ink-900"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLocale("hi")}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              locale === "hi"
                ? "bg-primary-700 text-white font-semibold"
                : "text-ink-600 hover:text-ink-900"
            }`}
          >
            हिं
          </button>
        </div>
      </header>

      {/* Login Card */}
      <main className="max-w-md w-full mx-auto px-6 py-8">
        <div className="bg-surface border border-line-300 rounded-xl p-8 shadow-xs">
          <h2 className="text-2xl font-bold text-ink-900 tracking-tight">
            Sign In
          </h2>
          <p className="mt-1 text-sm text-ink-600">
            Access your patient portal or staff clinic workspace.
          </p>

          {!mounted ? (
            <div className="mt-6 space-y-4 animate-pulse">
              <div className="h-10 bg-slate-100 rounded-lg" />
              <div className="h-10 bg-slate-100 rounded-lg" />
              <div className="h-10 bg-primary-700/20 rounded-lg" />
            </div>
          ) : (
            <>
              {errorMsg && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4" suppressHydrationWarning>
                <div>
                  <label className="block text-xs font-medium text-ink-900 mb-1">
                    Email Address
                  </label>
                  <div className="relative" suppressHydrationWarning>
                    <Mail className="w-4 h-4 text-ink-500 absolute left-3 top-3.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-line-300 bg-white text-sm text-ink-900 placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-primary-700"
                      suppressHydrationWarning
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-900 mb-1">
                    Password
                  </label>
                  <div className="relative" suppressHydrationWarning>
                    <Lock className="w-4 h-4 text-ink-500 absolute left-3 top-3.5" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-line-300 bg-white text-sm text-ink-900 placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-primary-700"
                      suppressHydrationWarning
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-line-300 text-primary-700 focus:ring-primary-700"
                    />
                    <span className="text-ink-600">Keep me signed in</span>
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-primary-700 hover:text-primary-800 font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-2.5 px-4 rounded-lg bg-primary-700 hover:bg-primary-800 text-white font-medium text-sm transition-colors shadow-xs disabled:opacity-50"
                >
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 pt-6 border-t border-line-300 text-center">
            <p className="text-xs text-ink-600">
              New patient?{" "}
              <Link
                href="/register"
                className="text-primary-700 hover:text-primary-800 font-semibold"
              >
                Create an account
              </Link>
            </p>
            <p className="mt-3 text-[11px] text-ink-500">
              Doctors & clinic staff: your credentials are created and managed by the hospital administrator.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-line-300 bg-surface px-6 py-4 text-center">
        <p className="text-xs text-ink-500 max-w-xl mx-auto">
          {t("common.disclaimer")}
        </p>
      </footer>
    </div>
  );
}
