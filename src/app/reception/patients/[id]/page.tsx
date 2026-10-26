"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { apiFetch } from "@/lib/api/client";
import { 
  User, 
  ArrowLeft, 
  Phone, 
  Calendar, 
  MapPin, 
  Link as LinkIcon, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  Clock, 
  ShieldCheck,
  X
} from "lucide-react";
import { StatusBadge, SourceBadge } from "@/components/shared/badges";

interface PatientData {
  id: string;
  patientCode: string;
  name: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  address?: string;
  linkedUid?: string | null;
}

interface AppointmentSummary {
  id: string;
  dateKey: string;
  doctorName?: string;
  status: string;
  source: "ONLINE" | "RECEPTION" | "WALK_IN";
  baseScore: number;
}

export default function ReceptionPatientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: patientId } = use(params);

  const [patient, setPatient] = useState<PatientData | null>(null);
  const [appointments, setAppointments] = useState<AppointmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Phone Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Link Account Modal
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [userUidToLink, setUserUidToLink] = useState("");
  const [idVerified, setIdVerified] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const pSnap = await getDoc(doc(db, "patients", patientId));
      if (!pSnap.exists()) {
        setError("Patient record not found");
        setLoading(false);
        return;
      }

      const pData = pSnap.data();
      setPatient({
        id: pSnap.id,
        patientCode: pData.patientCode || "P-000000",
        name: pData.name || "Unknown",
        dateOfBirth: pData.dateOfBirth || "",
        gender: pData.gender || "OTHER",
        phone: pData.phone || "",
        address: pData.address || "",
        linkedUid: pData.linkedUid || null,
      });
      setEditPhone(pData.phone || "");
      setEditAddress(pData.address || "");

      // Load appointments
      const apptsSnap = await getDocs(
        query(collection(db, "appointments"), where("patientId", "==", patientId))
      );
      const apptList: AppointmentSummary[] = [];
      apptsSnap.forEach((d) => {
        const ad = d.data();
        apptList.push({
          id: d.id,
          dateKey: ad.dateKey,
          doctorName: ad.doctorName,
          status: ad.status,
          source: ad.source || "ONLINE",
          baseScore: ad.baseScore ?? 0,
        });
      });

      apptList.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
      setAppointments(apptList);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load patient";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [patientId]);

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await apiFetch(`/api/patients/${patientId}`, {
        method: "PUT",
        body: JSON.stringify({
          phone: editPhone.trim(),
          address: editAddress.trim() || undefined,
        }),
      });
      setShowEditModal(false);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update patient");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLinkAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idVerified) {
      setLinkError("Staff must physically verify patient identity document.");
      return;
    }

    setLinkError(null);
    setIsLinking(true);
    try {
      await apiFetch(`/api/patients/${patientId}/link-account`, {
        method: "POST",
        body: JSON.stringify({
          userUid: userUidToLink.trim(),
        }),
      });
      setShowLinkModal(false);
      setUserUidToLink("");
      setIdVerified(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to link account";
      setLinkError(msg);
    } finally {
      setIsLinking(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-gray-500">
        <User className="w-8 h-8 animate-pulse mx-auto text-primary-600 mb-2" />
        <p className="font-medium text-sm">Loading patient profile...</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="max-w-4xl mx-auto bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-800">
        <AlertCircle className="w-8 h-8 mx-auto text-red-600 mb-2" />
        <h3 className="font-bold">{error || "Patient not found"}</h3>
        <Link
          href="/reception/patients"
          className="mt-4 inline-flex items-center text-sm font-semibold text-primary-700 hover:text-primary-800"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Return to Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/reception/patients"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Patient Directory</span>
      </Link>

      {/* Profile Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary-100 text-primary-800 flex items-center justify-center font-bold text-xl flex-shrink-0">
              {patient.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
                <span className="font-mono text-xs font-bold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-lg border border-primary-200">
                  {patient.patientCode}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-3">
                <span>DOB: <strong>{patient.dateOfBirth}</strong></span>
                <span>&bull;</span>
                <span>Gender: <strong>{patient.gender}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-xs"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Contact</span>
            </button>

            {!patient.linkedUid && (
              <button
                type="button"
                onClick={() => setShowLinkModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Link Online Account</span>
              </button>
            )}
          </div>
        </div>

        {/* Contact Details & Link Status */}
        <div className="mt-6 pt-5 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="flex items-center gap-2 text-gray-700">
            <Phone className="w-4 h-4 text-gray-400" />
            <span className="font-mono font-medium">{patient.phone}</span>
          </div>

          <div className="flex items-center gap-2 text-gray-700">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span>{patient.address || "No address recorded"}</span>
          </div>

          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-gray-400" />
            {patient.linkedUid ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Linked to User Account
              </span>
            ) : (
              <span className="text-gray-400 font-medium">Offline Patient Record</span>
            )}
          </div>
        </div>
      </div>

      {/* Appointment History */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2 text-gray-900 font-bold">
            <Calendar className="w-5 h-5 text-primary-700" />
            <h3>Appointment History ({appointments.length})</h3>
          </div>
        </div>

        {appointments.length === 0 ? (
          <div className="py-10 text-center text-gray-400 space-y-1">
            <Clock className="w-8 h-8 mx-auto text-gray-300" />
            <p className="text-sm font-semibold text-gray-700">No appointments recorded</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {appointments.map((a) => (
              <div key={a.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    {a.dateKey}
                  </span>
                  <div>
                    <div className="font-bold text-sm text-gray-900">
                      {a.doctorName || "Consultant Doctor"}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <SourceBadge source={a.source} />
                      <span className="text-xs text-gray-500">Base Score: {a.baseScore}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge status={a.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Phone Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Update Contact Information</h3>
              <button onClick={() => setShowEditModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleUpdateContact} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number (E.164)</label>
                <input
                  type="text"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full p-2.5 text-sm border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full p-2.5 text-sm border rounded-xl"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 bg-primary-700 text-white rounded-xl text-xs font-bold"
                >
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link Account Modal (Per DOC_4 P3: Staff ID Verification) */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-900">
                <LinkIcon className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base">Link to Online Patient Portal</h3>
              </div>
              <button onClick={() => setShowLinkModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <p className="text-xs text-gray-600">
              Connecting this offline file enables the patient to access their consultation history, prescriptions, and book online.
            </p>

            {linkError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs">
                {linkError}
              </div>
            )}

            <form onSubmit={handleLinkAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Online User Auth UID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Firebase Auth UID"
                  value={userUidToLink}
                  onChange={(e) => setUserUidToLink(e.target.value)}
                  className="w-full p-2.5 text-xs font-mono border rounded-xl"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={idVerified}
                    onChange={(e) => setIdVerified(e.target.checked)}
                    className="mt-0.5 rounded text-primary-700"
                  />
                  <span className="text-xs text-amber-900 font-medium">
                    I confirm that I have physically verified government photo identification (Aadhaar / Voter ID / Passport) for <strong>{patient.name}</strong> before linking this account.
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLinking || !idVerified || !userUidToLink.trim()}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold disabled:opacity-40"
                >
                  {isLinking ? "Linking..." : "Confirm & Link Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
