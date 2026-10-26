"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { apiFetch } from "@/lib/api/client";
import { Layers, Plus, Edit2, CheckCircle2, AlertCircle, X } from "lucide-react";

interface SpecItem {
  id: string;
  name: { en: string; hi: string };
  active: boolean;
}

export default function AdminSpecializationsPage() {
  const [specs, setSpecs] = useState<SpecItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingSpec, setEditingSpec] = useState<SpecItem | null>(null);

  const [nameEn, setNameEn] = useState("");
  const [nameHi, setNameHi] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadSpecs = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "specializations"));
      const list: SpecItem[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          name: data.name || { en: d.id, hi: d.id },
          active: data.active !== false,
        });
      });
      setSpecs(list);
    } catch (err) {
      console.error("Error loading specializations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSpecs();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    try {
      await apiFetch("/api/admin/specializations", {
        method: "POST",
        body: JSON.stringify({
          name: { en: nameEn.trim(), hi: nameHi.trim() },
        }),
      });
      setShowAdd(false);
      setNameEn("");
      setNameHi("");
      await loadSpecs();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to create specialization");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSpec) return;

    setSaving(true);
    setErrorMsg(null);
    try {
      await apiFetch(`/api/admin/specializations/${editingSpec.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: { en: nameEn.trim(), hi: nameHi.trim() },
          active: editingSpec.active,
        }),
      });
      setEditingSpec(null);
      await loadSpecs();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to update specialization");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (spec: SpecItem) => {
    try {
      await apiFetch(`/api/admin/specializations/${spec.id}`, {
        method: "PUT",
        body: JSON.stringify({
          active: !spec.active,
        }),
      });
      await loadSpecs();
    } catch (err) {
      alert("Failed to toggle status");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary-700" />
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Hospital Specializations
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Manage bilingual outpatient department categories (English &amp; Hindi).
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setNameEn("");
            setNameHi("");
            setErrorMsg(null);
            setShowAdd(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-700 hover:bg-primary-800 text-white rounded-xl text-xs font-bold shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Specialization</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-gray-400">Loading specializations...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Specialization (English)</th>
                  <th className="py-3 px-4">Specialization (Hindi)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {specs.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/70">
                    <td className="py-3.5 px-4 font-bold text-gray-900">{s.name.en}</td>
                    <td className="py-3.5 px-4 font-medium text-gray-700">{s.name.hi}</td>
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => toggleActive(s)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.active
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {s.active ? "ACTIVE" : "INACTIVE"}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSpec(s);
                          setNameEn(s.name.en);
                          setNameHi(s.name.hi);
                          setErrorMsg(null);
                        }}
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

      {(showAdd || editingSpec) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">
                {editingSpec ? "Edit Specialization" : "Create Specialization"}
              </h3>
              <button onClick={() => { setShowAdd(false); setEditingSpec(null); }}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-800 text-xs rounded-xl">{errorMsg}</div>
            )}

            <form onSubmit={editingSpec ? handleUpdate : handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Name in English *</label>
                <input
                  type="text"
                  required
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="e.g. Cardiology"
                  className="w-full p-2.5 text-xs border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Name in Hindi *</label>
                <input
                  type="text"
                  required
                  value={nameHi}
                  onChange={(e) => setNameHi(e.target.value)}
                  placeholder="e.g. हृदय रोग विशेषज्ञ"
                  className="w-full p-2.5 text-xs border rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowAdd(false); setEditingSpec(null); }}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-primary-700 text-white rounded-xl text-xs font-bold"
                >
                  {saving ? "Saving..." : "Save Specialization"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
