"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { apiFetch } from "@/lib/api/client";
import { Stethoscope, Edit2, CheckCircle2, AlertCircle, X } from "lucide-react";

interface DoctorUser {
  uid: string;
  displayName: string;
  email: string;
  active: boolean;
  specializationId?: string;
  specializationName?: string;
  qualification?: string;
  avgConsultMinutes?: number;
}

interface SpecItem {
  id: string;
  name: { en: string; hi: string };
}

export default function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState<DoctorUser[]>([]);
  const [specs, setSpecs] = useState<SpecItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDoc, setEditingDoc] = useState<DoctorUser | null>(null);

  const [specId, setSpecId] = useState("");
  const [qualification, setQualification] = useState("");
  const [avgMinutes, setAvgMinutes] = useState(15);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const specSnap = await getDocs(collection(db, "specializations"));
      const specList: SpecItem[] = [];
      specSnap.forEach((d) => specList.push({ id: d.id, ...d.data() } as SpecItem));
      setSpecs(specList);

      const userSnap = await getDocs(query(collection(db, "users"), where("role", "==", "doctor")));
      const docList: DoctorUser[] = [];
      userSnap.forEach((d) => {
        const data = d.data();
        const sMatch = specList.find((s) => s.id === data.doctorProfile?.specializationId);
        docList.push({
          uid: d.id,
          displayName: data.displayName || "Doctor",
          email: data.email,
          active: data.active !== false,
          specializationId: data.doctorProfile?.specializationId,
          specializationName: sMatch?.name?.en || data.doctorProfile?.specializationId || "General",
          qualification: data.doctorProfile?.qualification || "MBBS",
          avgConsultMinutes: data.doctorProfile?.avgConsultMinutes || 15,
        });
      });
      setDoctors(docList);
    } catch (err) {
      console.error("Error loading doctors:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openEdit = (d: DoctorUser) => {
    setEditingDoc(d);
    setSpecId(d.specializationId || (specs[0]?.id ?? ""));
    setQualification(d.qualification || "MBBS");
    setAvgMinutes(d.avgConsultMinutes || 15);
    setErrorMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;

    setSaving(true);
    setErrorMsg(null);
    try {
      await apiFetch(`/api/admin/doctors/${editingDoc.uid}`, {
        method: "PUT",
        body: JSON.stringify({
          specializationId: specId,
          qualification: qualification.trim(),
          avgConsultMinutes: Number(avgMinutes),
        }),
      });
      setEditingDoc(null);
      await loadData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to update doctor");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Stethoscope className="w-6 h-6 text-primary-700" />
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Consultant Doctor Directory
          </h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Configure clinical specializations, qualifications, and average consultation times per doctor.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-gray-400">Loading doctor profiles...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Doctor Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Specialization</th>
                  <th className="py-3 px-4">Qualification</th>
                  <th className="py-3 px-4">Avg Consult</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {doctors.map((d) => (
                  <tr key={d.uid} className="hover:bg-gray-50/70">
                    <td className="py-3.5 px-4 font-bold text-gray-900">{d.displayName}</td>
                    <td className="py-3.5 px-4 text-gray-600 font-mono">{d.email}</td>
                    <td className="py-3.5 px-4 font-semibold text-primary-800">{d.specializationName}</td>
                    <td className="py-3.5 px-4 text-gray-700">{d.qualification}</td>
                    <td className="py-3.5 px-4 text-gray-700 font-mono">{d.avgConsultMinutes} mins</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(d)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-900"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingDoc && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Edit Doctor Profile &bull; {editingDoc.displayName}</h3>
              <button onClick={() => setEditingDoc(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-800 text-xs rounded-xl">{errorMsg}</div>
            )}

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Specialization</label>
                <select
                  value={specId}
                  onChange={(e) => setSpecId(e.target.value)}
                  className="w-full p-2.5 text-xs border rounded-xl bg-white"
                >
                  {specs.map((s) => (
                    <option key={s.id} value={s.id}>{s.name.en}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Qualification</label>
                <input
                  type="text"
                  required
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  className="w-full p-2.5 text-xs border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Avg Consult Duration (Minutes)</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={avgMinutes}
                  onChange={(e) => setAvgMinutes(Number(e.target.value))}
                  className="w-full p-2.5 text-xs border rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-primary-700 text-white rounded-xl text-xs font-bold"
                >
                  {saving ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
