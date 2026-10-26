"use client";

import React, { useState } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useT } from "@/lib/i18n";
import { Mail, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const { t } = useT();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch {
      // Intentionally suppress error so email enumeration is prevented
    }

    setSubmitted(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-pageBg">
      <header className="border-b border-line-300 bg-surface px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-primary-700 flex items-center justify-center text-white font-bold text-lg">
            +
          </div>
          <span className="font-semibold text-xl text-ink-900 tracking-tight">
            {t("common.appName")}
          </span>
        </Link>
      </header>

      <main className="max-w-md w-full mx-auto px-6 py-8">
        <div className="bg-surface border border-line-300 rounded-xl p-8 shadow-xs">
          <h2 className="text-2xl font-bold text-ink-900 tracking-tight">
            Reset Password
          </h2>
          <p className="mt-1 text-sm text-ink-600">
            Enter your email to receive a password reset link.
          </p>

          {!mounted ? (
            <div className="mt-6 space-y-4 animate-pulse">
              <div className="h-10 bg-slate-100 rounded-lg" />
              <div className="h-10 bg-primary-700/20 rounded-lg" />
            </div>
          ) : submitted ? (
            <div className="mt-6 text-center">
              <div className="h-12 w-12 rounded-full bg-green-50 text-green-700 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-ink-900">Check Your Inbox</h3>
              <p className="mt-1 text-xs text-ink-600">
                If an account exists for {email}, a password reset link has been dispatched.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-block w-full py-2.5 px-4 rounded-lg bg-primary-700 hover:bg-primary-800 text-white text-sm font-medium transition-colors"
              >
                Return to Sign In
              </Link>
            </div>
          ) : (
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
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-line-300 bg-white text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
                    suppressHydrationWarning
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-primary-700 hover:bg-primary-800 text-white text-sm font-medium transition-colors disabled:opacity-50 mt-2"
              >
                {loading ? "Sending link..." : "Send Reset Link"}
              </button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="text-xs text-primary-700 hover:text-primary-800 font-medium"
                >
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>

      <footer className="border-t border-line-300 bg-surface px-6 py-4 text-center">
        <p className="text-xs text-ink-500 max-w-xl mx-auto">
          {t("common.disclaimer")}
        </p>
      </footer>
    </div>
  );
}
