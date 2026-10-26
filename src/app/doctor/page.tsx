"use client";

import React from "react";
import Link from "next/link";
import { useSession } from "@/features/auth/auth-context";
import { Users, Clock, ArrowRight } from "lucide-react";

export default function DoctorDashboard() {
  const session = useSession();
  const doctorName =
    session.status === "ready"
      ? session.user.displayName || "Doctor"
      : "Doctor";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight">
            Clinic Workspace &bull; {doctorName}
          </h1>
          <p className="text-sm text-ink-600 mt-0.5">
            Real-time prioritized patient queue with dynamic aging and explainable triage.
          </p>
        </div>

        <Link
          href="/doctor/queue"
          className="inline-flex items-center px-4 py-2.5 rounded-lg bg-primary-700 hover:bg-primary-800 text-white text-sm font-medium transition-colors shadow-xs"
        >
          <Users className="w-4 h-4 mr-2" />
          Open Live Queue
        </Link>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-surface border border-line-300 rounded-xl p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase text-ink-500">
            Waiting in Queue
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-ink-900">Live</span>
            <Users className="w-5 h-5 text-primary-700" />
          </div>
          <Link
            href="/doctor/queue"
            className="mt-4 inline-flex items-center text-xs text-primary-700 hover:text-primary-800 font-medium"
          >
            Review priority queue <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        <div className="bg-surface border border-line-300 rounded-xl p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase text-ink-500">
            Today's Schedule
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-ink-900">Slots</span>
            <Clock className="w-5 h-5 text-blue-700" />
          </div>
          <Link
            href="/doctor/slots"
            className="mt-4 inline-flex items-center text-xs text-primary-700 hover:text-primary-800 font-medium"
          >
            Manage appointment slots <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        <div className="bg-surface border border-line-300 rounded-xl p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase text-ink-500">
            Completed Consultations
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-ink-900">Stats</span>
            <Clock className="w-5 h-5 text-green-700" />
          </div>
          <Link
            href="/doctor/stats"
            className="mt-4 inline-flex items-center text-xs text-primary-700 hover:text-primary-800 font-medium"
          >
            View clinic statistics <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>
      </div>
    </div>
  );
}
