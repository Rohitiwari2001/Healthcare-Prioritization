"use client";

import React from "react";
import Link from "next/link";
import { useSession } from "@/features/auth/auth-context";
import { Calendar, Clock, ChevronRight } from "lucide-react";

export default function PatientDashboard() {
  const session = useSession();
  const userName = session.status === "ready" ? session.user.displayName || "Patient" : "Patient";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight">
            Welcome back, {userName}
          </h1>
          <p className="text-sm text-ink-600 mt-0.5">
            Manage your consultations and track your queue status in real time.
          </p>
        </div>

        <Link
          href="/patient/book"
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-primary-700 hover:bg-primary-800 text-white text-sm font-medium transition-colors shadow-xs"
        >
          <Calendar className="w-4 h-4 mr-2" />
          Book Appointment
        </Link>
      </div>

      {/* Next Appointment Card */}
      <div className="bg-surface border border-line-300 rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-line-300">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary-700">
            Next Scheduled Consultation
          </span>
          <span className="text-xs text-ink-500">Live Status</span>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-lg text-ink-900">
              Consultation with Doctor
            </h3>
            <p className="text-sm text-ink-600 flex items-center mt-1">
              <Clock className="w-4 h-4 mr-1 text-ink-500" />
              Check your upcoming appointments list below.
            </p>
          </div>

          <Link
            href="/patient/appointments"
            className="inline-flex items-center text-sm font-medium text-primary-700 hover:text-primary-800"
          >
            View details <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </div>
    </div>
  );
}
