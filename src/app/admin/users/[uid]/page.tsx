"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { apiFetch } from "@/lib/api/client-fetch";
import { ROLE_DEFAULTS, PERMISSION_KEYS, PermissionKey } from "@/lib/constants/permissions";
import { Role } from "@/lib/constants/enums";
import { ArrowLeft, KeyRound, AlertTriangle, Check, Copy } from "lucide-react";

const PERMISSION_GROUPS: Record<string, PermissionKey[]> = {
  Users: ["users.manage", "permissions.manage"],
  Catalogue: ["doctors.manage", "specializations.manage", "slots.manage", "slots.manage_own"],
  Patients: ["patients.search", "patients.create_profile"],
  Appointments: [
    "appointments.book_self",
    "appointments.book_for_patient",
    "appointments.cancel_for_patient",
    "appointments.checkin_for_patient",
    "appointments.edit_symptoms_for_patient",
    "appointments.register_walkin",
  ],
  Queue: ["queue.view_own", "queue.view_all", "queue.view_breakdown"],
  Consultation: ["consultation.manage"],
  Priority: ["priority.override"],
  Reports: ["reports.view_own", "reports.view"],
  Administration: ["config.edit", "audit.view", "simulation.run"],
};

export default function UserAccessEditorPage() {
  const { uid } = useParams() as { uid: string };
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [userData, setUserData] = useState<any>(null);
  const [active, setActive] = useState(true);
  const [role, setRole] = useState<Role>("receptionist");
  const [grants, setGrants] = useState<Set<PermissionKey>>(new Set());
  const [denies, setDenies] = useState<Set<PermissionKey>>(new Set());
  const [reason, setReason] = useState("");

  // Temporary password reset dialog
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) {
          const data = snap.data();
          setUserData(data);
          setActive(data.active !== false);
          setRole(data.role as Role);
          setGrants(new Set(data.grants || []));
          setDenies(new Set(data.denies || []));
        } else {
          setErrorMsg("User account not found");
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load user document");
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [uid]);

  const roleDefaults = new Set<PermissionKey>(ROLE_DEFAULTS[role] || []);

  const handlePermStateChange = (perm: PermissionKey, state: "default" | "grant" | "deny") => {
    const nextGrants = new Set(grants);
    const nextDenies = new Set(denies);

    if (state === "default") {
      nextGrants.delete(perm);
      nextDenies.delete(perm);
    } else if (state === "grant") {
      nextGrants.add(perm);
      nextDenies.delete(perm);
    } else if (state === "deny") {
      nextDenies.add(perm);
      nextGrants.delete(perm);
    }

    setGrants(nextGrants);
    setDenies(nextDenies);
  };

  const handleSaveAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (reason.trim().length < 5) {
      setErrorMsg("A justification reason of at least 5 characters is required.");
      return;
    }

    setSaving(true);
    try {
      await apiFetch(`/admin/users/${uid}/access`, {
        method: "PUT",
        json: {
          active,
          role: role !== userData.role ? role : undefined,
          grants: Array.from(grants),
          denies: Array.from(denies),
          reason: reason.trim(),
        },
      });

      setSuccessMsg("User access permissions successfully updated.");
      setReason("");
      setSaving(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update user access");
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!confirm("Are you sure you want to reset this user's password? A temporary password will be generated.")) {
      return;
    }

    setResettingPassword(true);
    try {
      const res = await apiFetch<{ temporaryPassword: string }>(
        `/admin/users/${uid}/reset-password`,
        { method: "POST" }
      );
      setTempPassword(res.temporaryPassword);
    } catch (err: any) {
      alert(err.message || "Failed to reset password");
    } finally {
      setResettingPassword(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-ink-500">Loading user permissions...</div>;
  }

  if (!userData) {
    return <div className="p-8 text-center text-xs text-red-600">{errorMsg || "User not found"}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link
            href="/admin/users"
            className="p-1.5 rounded-lg border border-line-300 bg-surface text-ink-600 hover:text-ink-900"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-ink-900 tracking-tight">
              Access Editor: {userData.displayName}
            </h1>
            <p className="text-xs text-ink-600">{userData.email} &bull; UID: {uid}</p>
          </div>
        </div>

        {userData.role !== "patient" && (
          <button
            onClick={handleResetPassword}
            disabled={resettingPassword}
            className="inline-flex items-center px-3 py-1.5 rounded-lg border border-line-300 bg-surface text-ink-900 hover:bg-slate-50 text-xs font-semibold shadow-xs disabled:opacity-50"
          >
            <KeyRound className="w-3.5 h-3.5 mr-1 text-amber-600" />
            {resettingPassword ? "Resetting..." : "Reset Password"}
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-xs">
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSaveAccess} className="space-y-6">
        {/* Account State Panel */}
        <div className="bg-surface border border-line-300 rounded-xl p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-ink-900 uppercase tracking-wide">
            Account State & Role
          </h2>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <div>
              <span className="text-xs font-semibold text-ink-900 block">
                Account Active Status
              </span>
              <span className="text-xs text-ink-500">
                Disabled accounts are blocked from accessing both API endpoints and Firestore reads.
              </span>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-700"></div>
              <span className="ml-3 text-xs font-semibold text-ink-900">
                {active ? "Active" : "Disabled"}
              </span>
            </label>
          </div>

          {(role === "receptionist" || role === "admin") && (
            <div className="pt-4 border-t border-line-300">
              <label className="block text-xs font-medium text-ink-900 mb-1">
                Assigned Role (Swap between Receptionist and Admin)
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="px-3 py-1.5 rounded-lg border border-line-300 text-xs text-ink-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-700"
              >
                <option value="receptionist">Receptionist</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          )}
        </div>

        {/* Permissions Matrix */}
        <div className="bg-surface border border-line-300 rounded-xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-line-300">
            <div>
              <h2 className="text-sm font-bold text-ink-900 uppercase tracking-wide">
                Permission Overrides Matrix
              </h2>
              <p className="text-xs text-ink-500 mt-0.5">
                Role defaults are applied automatically. Grants add capabilities; Denies always win.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {Object.entries(PERMISSION_GROUPS).map(([groupName, perms]) => (
              <div key={groupName} className="space-y-2">
                <h3 className="text-xs font-bold text-primary-700 uppercase tracking-wider">
                  {groupName}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {perms.map((p) => {
                    const isDefault = roleDefaults.has(p);
                    const isGranted = grants.has(p);
                    const isDenied = denies.has(p);

                    let currentState: "default" | "grant" | "deny" = "default";
                    if (isGranted) currentState = "grant";
                    if (isDenied) currentState = "deny";

                    return (
                      <div
                        key={p}
                        className="p-3 rounded-lg border border-line-300 bg-slate-50/50 flex items-center justify-between"
                      >
                        <div>
                          <span className="text-xs font-mono font-medium text-ink-900 block">
                            {p}
                          </span>
                          <span className="text-[10px] text-ink-500">
                            Role default: {isDefault ? "Included" : "Excluded"}
                          </span>
                        </div>

                        <div className="inline-flex rounded-md shadow-2xs text-[11px]">
                          <button
                            type="button"
                            onClick={() => handlePermStateChange(p, "default")}
                            className={`px-2 py-1 rounded-l-md border border-line-300 font-medium ${
                              currentState === "default"
                                ? "bg-white text-ink-900 font-bold"
                                : "bg-slate-100 text-ink-500 hover:text-ink-900"
                            }`}
                          >
                            Default
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePermStateChange(p, "grant")}
                            className={`px-2 py-1 border-t border-b border-line-300 font-medium ${
                              currentState === "grant"
                                ? "bg-teal-700 text-white font-bold"
                                : "bg-slate-100 text-ink-500 hover:text-ink-900"
                            }`}
                          >
                            Grant
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePermStateChange(p, "deny")}
                            className={`px-2 py-1 rounded-r-md border border-line-300 font-medium ${
                              currentState === "deny"
                                ? "bg-red-700 text-white font-bold"
                                : "bg-slate-100 text-ink-500 hover:text-ink-900"
                            }`}
                          >
                            Deny
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Justification Reason Field */}
        <div className="bg-surface border border-line-300 rounded-xl p-6 shadow-xs space-y-3">
          <label className="block text-xs font-bold text-ink-900 uppercase tracking-wide">
            Audit Justification Reason <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-ink-500">
            Mandatory explanation written to the immutable audit log explaining why this account's permissions were modified.
          </p>
          <textarea
            required
            rows={2}
            minLength={5}
            maxLength={300}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Granted reports.view for clinic audit coordinator role"
            className="w-full px-3 py-2 rounded-lg border border-line-300 text-xs text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
          />
          <div className="text-[11px] text-ink-500 text-right">
            {reason.length} / 300 characters
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-lg bg-primary-700 hover:bg-primary-800 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
            >
              {saving ? "Saving Changes..." : "Save Access Changes"}
            </button>
          </div>
        </div>
      </form>

      {/* Temporary Password Dialog */}
      {tempPassword && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-surface border border-line-300 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center space-x-2 text-amber-700">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <h3 className="font-bold text-ink-900 text-base">
                Password Reset Successfully
              </h3>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed">
              <strong>Temporary Password:</strong> Shown only once! Deliver this to the user securely. They will be forced to set a new password on login.
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={tempPassword}
                className="flex-1 font-mono text-sm px-3 py-2 bg-slate-50 border border-line-300 rounded-lg text-ink-900 select-all"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(tempPassword);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 3000);
                }}
                className="px-3 py-2 rounded-lg bg-primary-700 hover:bg-primary-800 text-white text-xs font-medium flex items-center space-x-1"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setTempPassword(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-ink-900 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
