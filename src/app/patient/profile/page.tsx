"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useSession } from "@/features/auth/auth-context";
import { User, Phone, Calendar, MapPin, CheckCircle2, AlertCircle, Save } from "lucide-react";

export default function PatientProfilePage() {
  const session = useSession();
  const uid = session.status === "ready" ? session.user.uid : null;
  const patientId = session.status === "ready" ? session.patientId : null;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [code, setCode] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadPatient() {
      if (!patientId) {
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "patients", patientId));
        if (snap.exists()) {
          const d = snap.data();
          setName(d.name || "");
          setPhone(d.phone || "");
          setDob(d.dateOfBirth || "");
          setGender(d.gender || "");
          setAddress(d.address || "");
          setCode(d.patientCode || "");
        }
      } catch (err) {
        console.error("Error loading patient profile:", err);
      } finally {
        setLoading(false);
      }
    }

    loadPatient();
  }, [patientId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;

    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      // Patient is allowed by Firestore rules to update their own name
      await updateDoc(doc(db, "patients", patientId), {
        name: name.trim(),
        address: address.trim() || null,
      });

      setSuccessMsg("Profile updated successfully!");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          My Patient Profile
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          View and manage your personal healthcare identification and contact details.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-800 flex items-center justify-center font-bold text-lg">
              <User className="w-6 h-6 text-primary-700" />
            </div>
            <div>
              <div className="font-bold text-gray-900">{name || "Patient Record"}</div>
              <div className="text-xs text-gray-500">{phone}</div>
            </div>
          </div>

          {code && (
            <span className="font-mono text-xs font-bold text-primary-700 bg-primary-50 px-3 py-1 rounded-lg border border-primary-200">
              {code}
            </span>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Full Legal Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                Date of Birth (Locked)
              </label>
              <input
                type="text"
                disabled
                value={dob}
                className="w-full p-2.5 text-sm border border-gray-200 bg-gray-50 rounded-xl text-gray-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                Gender (Locked)
              </label>
              <input
                type="text"
                disabled
                value={gender}
                className="w-full p-2.5 text-sm border border-gray-200 bg-gray-50 rounded-xl text-gray-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Registered Phone Number (Locked)
            </label>
            <input
              type="text"
              disabled
              value={phone}
              className="w-full p-2.5 text-sm font-mono border border-gray-200 bg-gray-50 rounded-xl text-gray-600"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              To update your phone number, please contact hospital reception with government ID.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Address / City
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Bandra West, Mumbai"
              className="w-full p-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="pt-3 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-700 hover:bg-primary-800 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving..." : "Save Profile"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
