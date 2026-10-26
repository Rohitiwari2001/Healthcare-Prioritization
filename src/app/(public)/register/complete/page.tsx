"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/features/auth/auth-context";
import { apiFetch } from "@/lib/api/client-fetch";
import { useT } from "@/lib/i18n";
import { Gender, roleHome } from "@/lib/constants/enums";
import { AlertCircle } from "lucide-react";

export default function RegisterCompletePage() {
  const router = useRouter();
  const session = useSession();
  const { t } = useT();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<Gender>("MALE");
  const [bloodGroup, setBloodGroup] = useState("");
  const [abhaId, setAbhaId] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (session.status === "signedOut") {
      router.replace("/login");
    } else if (session.status === "ready") {
      router.replace(roleHome(session.role));
    }
  }, [session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
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

      if (session.status === "noRole") {
        await session.user.getIdToken(true);
      }

      router.replace("/patient");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to complete patient profile.");
      setLoading(false);
    }
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
            Complete Patient Profile
          </h2>
          <p className="mt-1 text-sm text-ink-600">
            Please finish entering your patient details to activate your account.
          </p>

          {errorMsg && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-primary-700 hover:bg-primary-800 text-white text-sm font-medium transition-colors disabled:opacity-50 mt-4"
            >
              {loading ? "Activating..." : "Save and Continue"}
            </button>
          </form>
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
