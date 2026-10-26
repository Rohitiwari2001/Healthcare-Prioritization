"use client";

import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { apiFetch } from "@/lib/api/client";
import { DEFAULT_CONFIG_PARAMS } from "@/lib/priority-engine/default-config";
import { PriorityConfigParams } from "@/lib/priority-engine/types";
import { 
  Sliders, 
  History, 
  RotateCcw, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Info,
  Clock,
  Sparkles,
  ChevronDown
} from "lucide-react";

interface ConfigVersionDoc {
  id: string;
  version: number;
  params: PriorityConfigParams;
  changeNote: string;
  createdAt?: string;
  createdByUid?: string;
}

export default function AdminScoringConfigPage() {
  const [activeVersion, setActiveVersion] = useState<number>(1);
  const [versions, setVersions] = useState<ConfigVersionDoc[]>([]);
  const [formParams, setFormParams] = useState<PriorityConfigParams>(DEFAULT_CONFIG_PARAMS);
  const [changeNote, setChangeNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rollingBack, setRollingBack] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Get active pointer
      const metaSnap = await getDoc(doc(db, "meta", "activeConfig"));
      const activeVer = metaSnap.exists() ? metaSnap.data().version : 1;
      setActiveVersion(activeVer);

      // 2. Get all versions
      const versSnap = await getDocs(collection(db, "configVersions"));
      const list: ConfigVersionDoc[] = [];
      versSnap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          version: data.version ?? Number(d.id),
          params: data.params || DEFAULT_CONFIG_PARAMS,
          changeNote: data.changeNote || "Initial configuration",
          createdAt: data.createdAt?.toDate?.()?.toLocaleString() ?? "Seed version",
          createdByUid: data.createdByUid,
        });
      });

      list.sort((a, b) => b.version - a.version);
      setVersions(list);

      // Set form to active version's params
      const currentActive = list.find((v) => v.version === activeVer);
      if (currentActive) {
        setFormParams(JSON.parse(JSON.stringify(currentActive.params)));
      }
    } catch (err) {
      console.error("Error loading config:", err);
      setErrorMsg("Failed to load scoring configurations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePublishNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeNote.trim()) {
      setErrorMsg("A change note is required to explain why parameters were modified.");
      return;
    }

    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await apiFetch<{ version: number }>("/api/admin/config", {
        method: "PUT",
        body: JSON.stringify({
          params: formParams,
          changeNote: changeNote.trim(),
        }),
      });

      setSuccessMsg(`Published and activated Version ${res.version} successfully!`);
      setChangeNote("");
      await loadData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to publish config");
    } finally {
      setSaving(false);
    }
  };

  const handleRollback = async (targetVersion: number) => {
    const reason = prompt(`Enter reason for rolling back active configuration to Version ${targetVersion}:`);
    if (!reason || reason.trim().length < 5) {
      alert("A reason of at least 5 characters is required for rollback.");
      return;
    }

    setRollingBack(targetVersion);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      await apiFetch("/api/admin/config/active", {
        method: "PUT",
        body: JSON.stringify({
          version: targetVersion,
          changeNote: reason.trim(),
        }),
      });

      setSuccessMsg(`Active configuration rolled back to Version ${targetVersion}.`);
      await loadData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Rollback failed");
    } finally {
      setRollingBack(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 text-center text-gray-500">
        <Sliders className="w-8 h-8 animate-spin mx-auto text-primary-600 mb-2" />
        <p className="text-sm">Loading prioritization rules &amp; version history...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-6 h-6 text-primary-700" />
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Scoring Engine Configuration
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Tunable weights, severity points, age bands, and aging parameters. Changes create an immutable version.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
            Active: Version {activeVersion}
          </span>
        </div>
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

      {/* Editor & Version History Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Parameters Form */}
        <form onSubmit={handlePublishNew} className="lg:col-span-2 space-y-6">
          {/* Weights Section */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-sm">Formula Weights (w1, w2, w3)</h3>
              <span className="text-xs text-gray-400 font-mono">Base = w1·S + w2·A + w3·U</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Severity (w1)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formParams.weights.w1}
                  onChange={(e) =>
                    setFormParams({
                      ...formParams,
                      weights: { ...formParams.weights, w1: Number(e.target.value) },
                    })
                  }
                  className="w-full p-2.5 text-sm border rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Age (w2)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formParams.weights.w2}
                  onChange={(e) =>
                    setFormParams({
                      ...formParams,
                      weights: { ...formParams.weights, w2: Number(e.target.value) },
                    })
                  }
                  className="w-full p-2.5 text-sm border rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Urgency (w3)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formParams.weights.w3}
                  onChange={(e) =>
                    setFormParams({
                      ...formParams,
                      weights: { ...formParams.weights, w3: Number(e.target.value) },
                    })
                  }
                  className="w-full p-2.5 text-sm border rounded-xl font-mono"
                />
              </div>
            </div>
          </div>

          {/* Severity Points Section */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-sm">Clinical Severity Points</h3>
              <span className="text-xs text-amber-700 font-medium">Must be strictly increasing</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">MILD</label>
                <input
                  type="number"
                  min="0"
                  value={formParams.severityPoints.MILD}
                  onChange={(e) =>
                    setFormParams({
                      ...formParams,
                      severityPoints: { ...formParams.severityPoints, MILD: Number(e.target.value) },
                    })
                  }
                  className="w-full p-2.5 text-sm border rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">MODERATE</label>
                <input
                  type="number"
                  min="0"
                  value={formParams.severityPoints.MODERATE}
                  onChange={(e) =>
                    setFormParams({
                      ...formParams,
                      severityPoints: { ...formParams.severityPoints, MODERATE: Number(e.target.value) },
                    })
                  }
                  className="w-full p-2.5 text-sm border rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">SEVERE</label>
                <input
                  type="number"
                  min="0"
                  value={formParams.severityPoints.SEVERE}
                  onChange={(e) =>
                    setFormParams({
                      ...formParams,
                      severityPoints: { ...formParams.severityPoints, SEVERE: Number(e.target.value) },
                    })
                  }
                  className="w-full p-2.5 text-sm border rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-rose-700 mb-1">CRITICAL</label>
                <input
                  type="number"
                  min="0"
                  value={formParams.severityPoints.CRITICAL}
                  onChange={(e) =>
                    setFormParams({
                      ...formParams,
                      severityPoints: { ...formParams.severityPoints, CRITICAL: Number(e.target.value) },
                    })
                  }
                  className="w-full p-2.5 text-sm border border-rose-300 rounded-xl font-mono bg-rose-50/40"
                />
              </div>
            </div>
          </div>

          {/* Aging & No-Show Grace Period */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 text-sm border-b border-gray-100 pb-3">
              Dynamic Aging &amp; Grace Period
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Divisor (Minutes)</label>
                <input
                  type="number"
                  min="1"
                  value={formParams.aging.divisorMinutes}
                  onChange={(e) =>
                    setFormParams({
                      ...formParams,
                      aging: { ...formParams.aging, divisorMinutes: Number(e.target.value) },
                    })
                  }
                  className="w-full p-2.5 text-sm border rounded-xl font-mono"
                />
                <span className="text-[11px] text-gray-400">+1 pt per N minutes waiting</span>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Aging Cap (Max Pts)</label>
                <input
                  type="number"
                  min="0"
                  value={formParams.aging.cap}
                  onChange={(e) =>
                    setFormParams({
                      ...formParams,
                      aging: { ...formParams.aging, cap: Number(e.target.value) },
                    })
                  }
                  className="w-full p-2.5 text-sm border rounded-xl font-mono"
                />
                <span className="text-[11px] text-gray-400">Prevents starvation over-escalation</span>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">No-Show Grace (Mins)</label>
                <input
                  type="number"
                  min="0"
                  max="240"
                  value={formParams.noShowGraceMinutes}
                  onChange={(e) =>
                    setFormParams({
                      ...formParams,
                      noShowGraceMinutes: Number(e.target.value),
                    })
                  }
                  className="w-full p-2.5 text-sm border rounded-xl font-mono"
                />
                <span className="text-[11px] text-gray-400">Grace before marked NO_SHOW</span>
              </div>
            </div>
          </div>

          {/* Change Note & Submit Button */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Mandatory Change Note *
              </label>
              <textarea
                required
                rows={2}
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
                placeholder="Explain why parameters are being updated (e.g. Adjusted aging divisor from 10 to 8 for faster patient throughput)..."
                className="w-full p-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                maxLength={300}
              />
              <span className="text-[11px] text-gray-400">{changeNote.length}/300 characters</span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving || changeNote.trim().length < 5}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-700 hover:bg-primary-800 text-white rounded-xl text-sm font-bold shadow-sm disabled:opacity-40 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "Publishing..." : "Publish & Activate New Version"}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Version History Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-gray-900 font-bold border-b border-gray-100 pb-3">
              <History className="w-5 h-5 text-primary-700" />
              <h3>Version History ({versions.length})</h3>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {versions.map((v) => {
                const isActive = v.version === activeVersion;
                return (
                  <div
                    key={v.id}
                    className={`p-3.5 rounded-xl border text-xs transition-colors ${
                      isActive
                        ? "bg-emerald-50/70 border-emerald-300"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-gray-900">Version {v.version}</span>
                      {isActive ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-600 text-white font-bold">
                          ACTIVE
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={rollingBack === v.version}
                          onClick={() => handleRollback(v.version)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-700 hover:text-primary-900"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Rollback</span>
                        </button>
                      )}
                    </div>

                    <p className="text-gray-600 mt-1 italic">&quot;{v.changeNote}&quot;</p>
                    <div className="text-[10px] text-gray-400 mt-2 flex items-center justify-between">
                      <span>{v.createdAt}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
