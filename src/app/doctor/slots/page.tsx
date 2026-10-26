"use client";

import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useSession } from "@/features/auth/auth-context";
import { apiFetch } from "@/lib/api/client-fetch";
import { todayKey } from "@/lib/time";
import { Plus, Clock, Ban, Check, AlertCircle } from "lucide-react";

export default function DoctorSlotsPage() {
  const session = useSession();
  const doctorUid = session.status === "ready" ? session.user.uid : "";

  const [dateKey, setDateKey] = useState(todayKey());
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Slot generation modal
  const [showGenModal, setShowGenModal] = useState(false);
  const [dateFrom, setDateFrom] = useState(todayKey());
  const [dateTo, setDateTo] = useState(todayKey());
  const [blockStart, setBlockStart] = useState("09:00");
  const [blockEnd, setBlockEnd] = useState("13:00");
  const [slotMinutes, setSlotMinutes] = useState(15);
  const [genLoading, setGenLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const loadSlots = async () => {
    if (!doctorUid) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "slots"),
        where("doctorId", "==", doctorUid),
        where("dateKey", "==", dateKey)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => (a.startTime || "").localeCompare(b.startTime || ""));
      setSlots(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlots();
  }, [doctorUid, dateKey]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenLoading(true);
    setMsg(null);

    try {
      const res = await apiFetch<any>("/slots/generate", {
        method: "POST",
        json: {
          doctorId: doctorUid,
          dateFrom,
          dateTo,
          blocks: [{ start: blockStart, end: blockEnd }],
          slotMinutes: Number(slotMinutes),
        },
      });

      setMsg(`Created ${res.created} slots successfully! (Skipped ${res.skippedExisting} existing)`);
      setShowGenModal(false);
      loadSlots();
    } catch (err: any) {
      setMsg(err.message || "Failed to generate slots");
    } finally {
      setGenLoading(false);
    }
  };

  const handleToggleBlock = async (slotId: string, currentStatus: string) => {
    const willBlock = currentStatus === "AVAILABLE";
    try {
      await apiFetch(`/slots/${slotId}/block`, {
        method: "PUT",
        json: { blocked: willBlock },
      });
      loadSlots();
    } catch (err: any) {
      alert(err.message || "Failed to update slot status");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight">
            My Clinic Appointment Slots
          </h1>
          <p className="text-xs text-ink-600 mt-0.5">
            Generate and manage your daily availability blocks for patient appointments.
          </p>
        </div>

        <button
          onClick={() => setShowGenModal(true)}
          className="inline-flex items-center px-4 py-2 rounded-lg bg-primary-700 hover:bg-primary-800 text-white text-xs font-semibold shadow-xs"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Generate Slot Blocks
        </button>
      </div>

      {msg && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-900 text-xs rounded-lg">
          {msg}
        </div>
      )}

      {/* Date Filter */}
      <div className="bg-surface border border-line-300 rounded-xl p-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <label className="text-xs font-semibold text-ink-900">Select Date:</label>
          <input
            type="date"
            value={dateKey}
            onChange={(e) => setDateKey(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-line-300 text-xs text-ink-900 bg-white"
          />
        </div>
        <span className="text-xs text-ink-500">{slots.length} total slots</span>
      </div>

      {/* Slots List */}
      <div className="bg-surface border border-line-300 rounded-xl p-6 shadow-xs">
        {loading ? (
          <div className="p-8 text-center text-xs text-ink-500">Loading schedule...</div>
        ) : slots.length === 0 ? (
          <div className="p-8 text-center text-xs text-ink-500">
            No slots scheduled for this date. Click "Generate Slot Blocks" to create your schedule.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {slots.map((s) => {
              const isAvailable = s.status === "AVAILABLE";
              const isBooked = s.status === "BOOKED";
              const isBlocked = s.status === "BLOCKED";

              return (
                <div
                  key={s.id}
                  className={`p-3 rounded-lg border text-center text-xs space-y-1.5 transition-all ${
                    isBooked
                      ? "bg-blue-50 border-blue-200 text-blue-900 font-semibold"
                      : isBlocked
                      ? "bg-slate-100 border-slate-300 text-slate-500"
                      : "bg-teal-50/50 border-primary-100 text-primary-950"
                  }`}
                >
                  <span className="block font-bold text-sm">{s.startTime}</span>
                  <span className="text-[10px] block opacity-80 uppercase tracking-wider">
                    {s.status}
                  </span>

                  {!isBooked && (
                    <button
                      onClick={() => handleToggleBlock(s.id, s.status)}
                      className={`w-full py-1 rounded text-[10px] font-semibold transition-colors ${
                        isAvailable
                          ? "bg-white hover:bg-red-50 text-red-700 border border-red-200"
                          : "bg-white hover:bg-teal-50 text-primary-700 border border-primary-200"
                      }`}
                    >
                      {isAvailable ? "Block" : "Unblock"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Generation Modal */}
      {showGenModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-surface border border-line-300 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-ink-900 text-base">Generate Daily Appointment Slots</h3>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1">From Date</label>
                  <input
                    type="date"
                    required
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-line-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1">To Date</label>
                  <input
                    type="date"
                    required
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-line-300 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={blockStart}
                    onChange={(e) => setBlockStart(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-line-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={blockEnd}
                    onChange={(e) => setBlockEnd(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-line-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-900 mb-1">
                  Slot Duration (Minutes)
                </label>
                <select
                  value={slotMinutes}
                  onChange={(e) => setSlotMinutes(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded border border-line-300 text-xs bg-white"
                >
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes (Standard)</option>
                  <option value={20}>20 minutes</option>
                  <option value={30}>30 minutes</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowGenModal(false)}
                  className="px-4 py-2 rounded text-xs text-ink-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={genLoading}
                  className="px-5 py-2 rounded bg-primary-700 hover:bg-primary-800 text-white text-xs font-semibold"
                >
                  {genLoading ? "Generating..." : "Generate Slots"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
