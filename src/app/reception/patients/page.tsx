"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { apiFetch } from "@/lib/api/client";
import { 
  Users, 
  Search, 
  UserPlus, 
  Phone, 
  Calendar, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  X,
  CreditCard
} from "lucide-react";

interface PatientRecord {
  id: string;
  patientCode: string;
  name: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  linkedUid?: string | null;
  createdAt?: string;
}

export default function ReceptionPatientsPage() {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states for creating patient
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER">("MALE");
  const [phone, setPhone] = useState("+91");
  const [address, setAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "patients"), limit(100)));
      const list: PatientRecord[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          patientCode: data.patientCode || "P-000000",
          name: data.name || "Unknown",
          dateOfBirth: data.dob || data.dateOfBirth || "",
          gender: data.gender || "OTHER",
          phone: data.phone || "",
          linkedUid: data.uid || data.linkedUid || null,
        });
      });
      setPatients(list);
    } catch (err) {
      console.error("Error loading patients:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      await apiFetch("/patients", {
        method: "POST",
        json: {
          name: name.trim(),
          dob,
          gender,
          phone: phone.trim(),
          address: address.trim() || undefined,
        },
      });

      setShowAddModal(false);
      setName("");
      setDob("");
      setPhone("+91");
      setAddress("");
      await loadPatients();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create patient";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPatients = patients.filter((p) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.patientCode.toLowerCase().includes(q) ||
      p.phone.includes(q)
    );
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Patient Directory &amp; Records
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Search patient profiles by national phone number, sequential code, or full name.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-700 hover:bg-primary-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New Patient</span>
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, phone (e.g. +919876543210), or ID (e.g. P-000001)..."
          className="w-full text-sm outline-none text-gray-800 placeholder-gray-400"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm("")}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-gray-400 space-y-2">
            <Users className="w-8 h-8 animate-pulse mx-auto text-primary-600" />
            <p className="text-sm">Loading patient records...</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="py-12 text-center text-gray-400 space-y-2">
            <Users className="w-8 h-8 mx-auto text-gray-300" />
            <p className="font-semibold text-gray-700">No patient records found</p>
            <p className="text-xs text-gray-400">Try adjusting your search criteria or register a new patient.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Patient Code</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Date of Birth / Gender</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">Account Link</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPatients.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-xs text-primary-700">
                      {p.patientCode}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      {p.name}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-600">
                      {p.dateOfBirth} &bull; {p.gender}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-gray-700">
                      {p.phone}
                    </td>
                    <td className="py-3.5 px-4">
                      {p.linkedUid ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Online Portal
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400 font-medium">
                          Offline Only
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/reception/patients/${p.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-900"
                      >
                        <span>View File</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-primary-50/50">
              <div className="flex items-center gap-2 text-primary-950 font-bold">
                <UserPlus className="w-5 h-5 text-primary-700" />
                <h3>Register Offline / Walk-in Patient</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePatient} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full p-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Gender *
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as "MALE" | "FEMALE" | "OTHER")}
                    className="w-full p-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Phone Number (E.164 format) *
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+919876543210"
                  className="w-full p-2.5 text-sm font-mono border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Address / City (Optional)
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Flat 402, Mumbai"
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-primary-700 hover:bg-primary-800 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Save Patient"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
