"use client";

import { useSession } from "@/features/auth/auth-context";
import { useI18n } from "@/lib/i18n";
import { User, Languages, Lock, Shield, Mail, Key } from "lucide-react";
import Link from "next/link";

export default function AccountPage() {
  const session = useSession();
  const { locale, setLocale, t } = useI18n();

  if (session.status === "loading") {
    return <div className="py-12 text-center text-gray-500">Loading account...</div>;
  }

  if (session.status !== "ready") {
    return <div className="py-12 text-center text-gray-500">Please sign in to view account settings.</div>;
  }

  const user = session.user;
  const role = session.role;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Account Settings
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage your personal credentials, language preference, and security options.
        </p>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
          <div className="w-12 h-12 rounded-2xl bg-primary-100 text-primary-800 flex items-center justify-center font-bold text-lg">
            <User className="w-6 h-6 text-primary-700" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">{user.displayName || "Hospital User"}</h2>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
              <Mail className="w-3.5 h-3.5" />
              <span>{user.email}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-gray-50 rounded-xl">
            <span className="text-gray-400 block mb-0.5 uppercase tracking-wider font-bold">Assigned Role</span>
            <span className="font-bold text-gray-900 uppercase font-mono">{role}</span>
          </div>

          <div className="p-3 bg-gray-50 rounded-xl">
            <span className="text-gray-400 block mb-0.5 uppercase tracking-wider font-bold">Account UID</span>
            <span className="font-mono text-gray-700 truncate block" title={user.uid}>{user.uid}</span>
          </div>
        </div>
      </div>

      {/* Language Preference */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-gray-900 font-bold border-b border-gray-100 pb-3">
          <Languages className="w-5 h-5 text-primary-700" />
          <h3>Language Preference / भाषा प्राथमिकता</h3>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setLocale("en")}
            className={`flex-1 py-3 px-4 rounded-xl border text-sm font-bold transition-all ${
              locale === "en"
                ? "bg-primary-50 border-primary-500 text-primary-800 ring-2 ring-primary-500/20"
                : "border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            English
          </button>

          <button
            type="button"
            onClick={() => setLocale("hi")}
            className={`flex-1 py-3 px-4 rounded-xl border text-sm font-bold transition-all ${
              locale === "hi"
                ? "bg-primary-50 border-primary-500 text-primary-800 ring-2 ring-primary-500/20"
                : "border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            हिन्दी (Hindi)
          </button>
        </div>
      </div>

      {/* Security & Password */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-gray-900 font-bold border-b border-gray-100 pb-3">
          <Lock className="w-5 h-5 text-primary-700" />
          <h3>Security &amp; Password</h3>
        </div>

        <p className="text-xs text-gray-500">
          To update your account password, you can change it directly or request a reset email.
        </p>

        <div className="flex items-center gap-3 pt-1">
          <Link
            href="/change-password"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-700 hover:bg-primary-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Key className="w-4 h-4" />
            <span>Change Password</span>
          </Link>

          <Link
            href="/forgot-password"
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold shadow-xs"
          >
            <span>Send Password Reset Email</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
