"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/features/auth/auth-context";
import { apiFetch } from "@/lib/api/client-fetch";
import { roleHome } from "@/lib/constants/enums";
import { useT } from "@/lib/i18n";
import { Lock, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ChangePasswordPage() {
  const router = useRouter();
  const session = useSession();
  const { t } = useT();

  const [mounted, setMounted] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (session.status === "signedOut" && !success) {
      router.replace("/login");
    } else if (session.status === "ready" && !session.mustChangePassword) {
      router.replace(roleHome(session.role));
    }
  }, [session, router, success]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      await apiFetch("/auth/change-initial-password", {
        method: "POST",
        json: { newPassword },
      });

      // Show success state and sign out
      setSuccess(true);
      await session.signOut();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update password.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-pageBg">
      <header className="border-b border-line-300 bg-surface px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-primary-700 flex items-center justify-center text-white font-bold text-lg">
            +
          </div>
          <span className="font-semibold text-xl text-ink-900 tracking-tight">
            {t("common.appName")}
          </span>
        </div>
      </header>

      <main className="max-w-md w-full mx-auto px-6 py-8">
        <div className="bg-surface border border-line-300 rounded-xl p-8 shadow-xs">
          <h2 className="text-2xl font-bold text-ink-900 tracking-tight">
            Change Temporary Password
          </h2>
          <p className="mt-1 text-sm text-ink-600">
            For security reasons, you must set a new permanent password on your first sign-in.
          </p>

          {!mounted ? (
            <div className="mt-6 space-y-4 animate-pulse">
              <div className="h-10 bg-slate-100 rounded-lg" />
              <div className="h-10 bg-slate-100 rounded-lg" />
              <div className="h-10 bg-primary-700/20 rounded-lg" />
            </div>
          ) : success ? (
            <div className="mt-6 text-center">
              <div className="h-12 w-12 rounded-full bg-green-50 text-green-700 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-ink-900">Password Changed Successfully</h3>
              <p className="mt-1 text-xs text-ink-600">
                Please sign in with your new permanent password.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-block w-full py-2.5 px-4 rounded-lg bg-primary-700 hover:bg-primary-800 text-white text-sm font-medium transition-colors"
              >
                Sign In Now
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4" suppressHydrationWarning>
              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-ink-900 mb-1">
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative" suppressHydrationWarning>
                  <Lock className="w-4 h-4 text-ink-500 absolute left-3 top-3.5" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-line-300 bg-white text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
                    suppressHydrationWarning
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-900 mb-1">
                  Confirm New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative" suppressHydrationWarning>
                  <Lock className="w-4 h-4 text-ink-500 absolute left-3 top-3.5" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-line-300 bg-white text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
                    suppressHydrationWarning
                  />
                </div>
              </div>

              <div className="text-[11px] text-ink-500">
                Password must be at least 8 characters with at least one letter and one number.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-primary-700 hover:bg-primary-800 text-white text-sm font-medium transition-colors disabled:opacity-50 mt-2"
              >
                {loading ? "Updating password..." : "Set New Password"}
              </button>
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
