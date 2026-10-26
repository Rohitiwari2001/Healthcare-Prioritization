"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";
import { ShieldAlert, Calendar, Users, Stethoscope } from "lucide-react";

export default function LandingPage() {
  const { t, locale, setLocale } = useT();

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-line-300 bg-surface px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-primary-700 flex items-center justify-center text-white font-bold text-lg">
            +
          </div>
          <span className="font-semibold text-xl text-ink-900 tracking-tight">
            {t("common.appName")}
          </span>
        </div>

        <div className="flex items-center space-x-4">
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

          <Link
            href="/login"
            className="text-sm font-medium text-primary-700 hover:text-primary-800 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Main Hero */}
      <main className="max-w-4xl mx-auto px-6 py-12 flex-1 flex flex-col items-center text-center justify-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primary-50 text-primary-800 border border-primary-100 text-xs font-semibold mb-6">
          <span>Explainable Patient Prioritization</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-bold text-ink-900 tracking-tight max-w-2xl leading-tight">
          Smart Healthcare Appointment & Patient Prioritization
        </h1>

        <p className="mt-4 text-base sm:text-lg text-ink-600 max-w-xl">
          An explainable, multi-factor clinical triage and fair queueing platform with dynamic aging, immediate red-flag detection, and four dedicated role workspaces.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link
            href="/register"
            className="px-6 py-3 rounded-lg bg-primary-700 hover:bg-primary-800 text-white font-medium text-base shadow-sm transition-all text-center"
          >
            Register as Patient
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 rounded-lg bg-white border border-line-300 text-ink-900 hover:bg-slate-50 font-medium text-base transition-all text-center"
          >
            Staff & Doctor Login
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full text-left">
          <div className="p-5 rounded-xl border border-line-300 bg-surface shadow-xs">
            <div className="h-10 w-10 rounded-lg bg-teal-50 text-primary-700 flex items-center justify-center mb-3">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-ink-900">Explainable Scoring</h3>
            <p className="mt-1 text-sm text-ink-600">
              Clear breakdown of severity, age bands, and urgency factors with audited formula tuning.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-line-300 bg-surface shadow-xs">
            <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
              <Calendar className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-ink-900">Unified Live Queue</h3>
            <p className="mt-1 text-sm text-ink-600">
              Online appointments and offline walk-ins served fairly with client-side aging tickers.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-line-300 bg-surface shadow-xs">
            <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center mb-3">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-ink-900">Granular Access Control</h3>
            <p className="mt-1 text-sm text-ink-600">
              Role defaults plus per-user grants and denies for Patients, Doctors, Receptionists, and Admins.
            </p>
          </div>
        </div>
      </main>

      {/* Footer Disclaimer */}
      <footer className="border-t border-line-300 bg-surface px-6 py-4 text-center">
        <p className="text-xs text-ink-500 max-w-2xl mx-auto">
          {t("common.disclaimer")}
        </p>
      </footer>
    </div>
  );
}
