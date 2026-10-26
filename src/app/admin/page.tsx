"use client";

import React from "react";
import Link from "next/link";
import { useSession } from "@/features/auth/auth-context";
import { Users, Sliders, ShieldAlert, ArrowRight, FlaskConical } from "lucide-react";

export default function AdminDashboard() {
  const session = useSession();
  const adminName =
    session.status === "ready"
      ? session.user.displayName || "Administrator"
      : "Administrator";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight">
            System Administration &bull; {adminName}
          </h1>
          <p className="text-sm text-ink-600 mt-0.5">
            Full control of accounts, role grants and denies, clinical scoring parameters, and audit records.
          </p>
        </div>

        <Link
          href="/admin/users/new"
          className="inline-flex items-center px-4 py-2.5 rounded-lg bg-primary-700 hover:bg-primary-800 text-white text-sm font-medium transition-colors shadow-xs"
        >
          <Users className="w-4 h-4 mr-2" />
          Create Staff Account
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-surface border border-line-300 rounded-xl p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase text-ink-500">
            Access Control
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold text-ink-900">User Management</span>
            <Users className="w-5 h-5 text-primary-700" />
          </div>
          <p className="mt-1 text-xs text-ink-600">
            Create doctors and receptionists, assign per-user grants and denies, reset credentials.
          </p>
          <Link
            href="/admin/users"
            className="mt-4 inline-flex items-center text-xs text-primary-700 hover:text-primary-800 font-medium"
          >
            Manage users & access <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        <div className="bg-surface border border-line-300 rounded-xl p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase text-ink-500">
            Clinical Triage Engine
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold text-ink-900">Scoring Config</span>
            <Sliders className="w-5 h-5 text-indigo-700" />
          </div>
          <p className="mt-1 text-xs text-ink-600">
            Edit versioned weights, severity points, age bands, aging caps, and red-flag rules.
          </p>
          <Link
            href="/admin/config"
            className="mt-4 inline-flex items-center text-xs text-primary-700 hover:text-primary-800 font-medium"
          >
            Configure parameters <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        <div className="bg-surface border border-line-300 rounded-xl p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase text-ink-500">
            Compliance & Research
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold text-ink-900">Audit & Simulation</span>
            <ShieldAlert className="w-5 h-5 text-amber-700" />
          </div>
          <p className="mt-1 text-xs text-ink-600">
            Inspect immutable audit trails of overrides and run comparative queue simulations.
          </p>
          <div className="mt-4 flex items-center space-x-3">
            <Link
              href="/admin/audit"
              className="text-xs text-primary-700 hover:text-primary-800 font-medium inline-flex items-center"
            >
              Audit log <ArrowRight className="w-3 h-3 ml-0.5" />
            </Link>
            <span className="text-line-300">|</span>
            <Link
              href="/admin/simulation"
              className="text-xs text-primary-700 hover:text-primary-800 font-medium inline-flex items-center"
            >
              Simulation <FlaskConical className="w-3 h-3 ml-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
