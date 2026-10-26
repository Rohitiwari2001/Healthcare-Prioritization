"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { apiFetch } from "@/lib/api/client-fetch";
import { Role } from "@/lib/constants/enums";
import { Copy, Check, AlertTriangle, ArrowLeft } from "lucide-react";

export default function CreateUserPage() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<Role>("doctor");

  // Doctor profile fields
  const [specializations, setSpecializations] = useState<Array<{ id: string; name: string }>>([]);
  const [specializationId, setSpecializationId] = useState("");
  const [qualification, setQualification] = useState("MBBS, MD");
  const [avgConsultMinutes, setAvgConsultMinutes] = useState(12);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Secret-once dialog state
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadSpecs() {
      try {
        const q = query(collection(db, "specializations"), where("active", "==", true));
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({ id: d.id, name: d.data().name }));
        setSpecializations(list);
        if (list.length > 0) {
          setSpecializationId(list[0].id);
        }
      } catch (err) {
        console.error("Failed to load specializations:", err);
      }
    }
    loadSpecs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const payload: any = {
      email: email.trim(),
      displayName: displayName.trim(),
      role,
    };

    if (role === "doctor") {
      payload.doctorProfile = {
        specializationId,
        qualification: qualification.trim(),
        avgConsultMinutes: Number(avgConsultMinutes),
      };
    }

    try {
      const res = await apiFetch<{ uid: string; temporaryPassword: string }>("/admin/users", {
        method: "POST",
        json: payload,
      });

      setTemporaryPassword(res.temporaryPassword);
      setLoading(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create staff account");
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (temporaryPassword) {
      navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-3">
        <Link
          href="/admin/users"
          className="p-1.5 rounded-lg border border-line-300 bg-surface text-ink-600 hover:text-ink-900"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight">
            Create Staff Account
          </h1>
          <p className="text-xs text-ink-600">
            Issue managed credentials for doctors, receptionists, or administrators.
          </p>
        </div>
      </div>

      <div className="bg-surface border border-line-300 rounded-xl p-6 shadow-xs">
        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-900 mb-1">
              Account Role <span className="text-red-500">*</span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full px-3 py-2 rounded-lg border border-line-300 bg-white text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
            >
              <option value="doctor">Doctor</option>
              <option value="receptionist">Receptionist</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-900 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Dr. Rajesh Sharma"
              className="w-full px-3 py-2 rounded-lg border border-line-300 bg-white text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-900 mb-1">
              Institutional Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@clinic.example.com"
              className="w-full px-3 py-2 rounded-lg border border-line-300 bg-white text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
            />
          </div>

          {/* Doctor-Specific Details */}
          {role === "doctor" && (
            <div className="pt-4 border-t border-line-300 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-primary-700">
                Doctor Profile Details
              </span>

              <div>
                <label className="block text-xs font-medium text-ink-900 mb-1">
                  Specialization <span className="text-red-500">*</span>
                </label>
                <select
                  value={specializationId}
                  onChange={(e) => setSpecializationId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-line-300 bg-white text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
                >
                  {specializations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-ink-900 mb-1">
                    Qualifications <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    placeholder="e.g. MBBS, MD (Medicine)"
                    className="w-full px-3 py-2 rounded-lg border border-line-300 bg-white text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-900 mb-1">
                    Avg Consultation (Minutes) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    required
                    value={avgConsultMinutes}
                    onChange={(e) => setAvgConsultMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-line-300 bg-white text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-primary-700 hover:bg-primary-800 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? "Generating account..." : "Create Account & Generate Temporary Password"}
            </button>
          </div>
        </form>
      </div>

      {/* Secret-Once Dialog (DOC_6 Section 5) */}
      {temporaryPassword && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-surface border border-line-300 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center space-x-2 text-amber-700">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <h3 className="font-bold text-ink-900 text-base">
                Temporary Password Generated
              </h3>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed">
              <strong>Shown only once!</strong> Copy this temporary password now and deliver it securely to the staff member. They will be forced to change it on their first login.
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">
                Temporary Password
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={temporaryPassword}
                  className="flex-1 font-mono text-sm px-3 py-2 bg-slate-50 border border-line-300 rounded-lg text-ink-900 select-all"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-3 py-2 rounded-lg bg-primary-700 hover:bg-primary-800 text-white text-xs font-medium flex items-center space-x-1"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  setTemporaryPassword(null);
                  setEmail("");
                  setDisplayName("");
                }}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-ink-900 text-xs font-semibold"
              >
                I have safely stored this password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
