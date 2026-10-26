"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { apiFetch } from "@/lib/api/client-fetch";
import { useT } from "@/lib/i18n";
import { Gender } from "@/lib/constants/enums";
import { AlertCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { t, locale, setLocale } = useT();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<Gender>("MALE");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [abhaId, setAbhaId] = useState("");

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Create account in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      // 2. Complete patient profile via route handler
      await apiFetch("/auth/complete-patient-profile", {
        method: "POST",
        json: {
          name: name.trim(),
          phone: phone.trim(),
          dob,
          gender,
          bloodGroup: bloodGroup.trim() || undefined,
          abhaId: abhaId.trim() || undefined,
        },
      });

      // 3. Force token refresh to get new claims
      await userCredential.user.getIdToken(true);

      // 4. Redirect to patient portal
      router.replace("/patient");
    } catch (err: any) {
      if (err?.code === "auth/email-already-in-use") {
        setErrorMsg("An account with this email address already exists.");
      } else {
        setErrorMsg(err.message || "Registration failed. Please try again.");
      }
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

      {/* Main Register Form */}
      <main className="max-w-lg w-full mx-auto px-6 py-8">
        <div className="bg-surface border border-line-300 rounded-xl p-8 shadow-xs">
          <h2 className="text-2xl font-bold text-ink-900 tracking-tight">
            Patient Registration
          </h2>
          <p className="mt-1 text-sm text-ink-600">
            Create your account to book appointments and track your live queue status.
          </p>

          {!mounted ? (
            <div className="mt-6 space-y-4 animate-pulse">
              <div className="h-10 bg-slate-100 rounded-lg" />
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
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ravi Kumar"
                className="w-full px-3 py-2.5 rounded-lg border border-line-300 bg-white text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink-900 mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full px-3 py-2.5 rounded-lg border border-line-300 bg-white text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-900 mb-1">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-line-300 bg-white text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink-900 mb-1">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Gender)}
                  className="w-full px-3 py-2.5 rounded-lg border border-line-300 bg-white text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-900 mb-1">
                  Blood Group (optional)
                </label>
                <input
                  type="text"
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  placeholder="e.g. O+, B+"
                  className="w-full px-3 py-2.5 rounded-lg border border-line-300 bg-white text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-900 mb-1">
                ABHA ID (optional)
              </label>
              <input
                type="text"
                value={abhaId}
                onChange={(e) => setAbhaId(e.target.value)}
                placeholder="14-digit ABHA number or address"
                className="w-full px-3 py-2.5 rounded-lg border border-line-300 bg-white text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-900 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3 py-2.5 rounded-lg border border-line-300 bg-white text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-900 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full px-3 py-2.5 rounded-lg border border-line-300 bg-white text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
              />
              <span className="block text-[11px] text-ink-500 mt-1">
                Must contain at least 8 characters with letters and numbers.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-primary-700 hover:bg-primary-800 text-white text-sm font-medium transition-colors disabled:opacity-50 mt-4"
            >
              {loading ? "Registering account..." : "Complete Registration"}
            </button>
          </form>
          </>
          )}

          <div className="mt-6 pt-6 border-t border-line-300 text-center">
            <p className="text-xs text-ink-600">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-primary-700 hover:text-primary-800 font-semibold"
              >
                Sign In
              </Link>
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
