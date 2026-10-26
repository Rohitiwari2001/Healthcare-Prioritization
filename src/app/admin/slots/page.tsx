"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { apiFetch } from "@/lib/api/client";
import { todayKey, formatTime } from "@/lib/time";
import { Calendar, Clock, Plus, Lock, Unlock, CheckCircle2, AlertCircle, X } from "lucide-react";

interface DoctorOption {
  uid: string;
  displayName: string;
}

interface SlotItem {
  id: string;
  doctorId: string;
  dateKey: string;
  startAt: string;
  endAt: string;
  startTimeStr: string;
  endTimeStr: string;
  status: "AVAILABLE" | "BOOKED" | "BLOCKED";
  blockReason?: string | null;
}

export default function AdminSlotsPage() {
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(todayKey());
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Generate Modal
  const [showGenModal, setShowGenModal] = useState(false);
  const [genDateFrom, setGenDateFrom] = useState(todayKey());
  const [genDateTo, setGenDateTo] = useState(todayKey());
  const [startHour, setStartHour] = useState("09:00");
  const [endHour, setEndHour] = useState("13:00");
  const [slotDuration, setSlotDuration] = useState(15);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadDoctors() {
      try {
        const snap = await getDocs(collection(db, "doctors"));
        const list: DoctorOption[] = [];
        snap.forEach((d) => {
          const data = d.data();
          if (data.active !== false) {
            list.push({ uid: d.id, displayName: data.name || "Doctor" });
          }
        });
        if (list.length === 0) {
          const userSnap = await getDocs(query(collection(db, "users"), where("role", "==", "doctor")));
          userSnap.forEach((d) => {
            const data = d.data();
            if (data.active !== false) {
              list.push({ uid: d.id, displayName: data.displayName || "Doctor" });
            }
          });
        }
        setDoctors(list);
        if (list.length > 0) {
          setSelectedDoctorId((prev) => prev || list[0].uid);
        }
      } catch (err) {
        console.error("Failed to load doctors:", err);
      }
    }
    loadDoctors();
  }, []);

  const loadSlots = async () => {
    if (!selectedDoctorId) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "slots"),
        where("doctorId", "==", selectedDoctorId),
        where("dateKey", "==", selectedDate)
      );
      const snap = await getDocs(q);
      const list: SlotItem[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          doctorId: data.doctorId,
          dateKey: data.dateKey,
          startAt: data.startAt?.toDate?.()?.toISOString() ?? "",
          endAt: data.endAt?.toDate?.()?.toISOString() ?? "",
          startTimeStr: data.startTime || data.startTimeStr || "",
          endTimeStr: data.endTime || data.endTimeStr || "",
          status: data.status,
          blockReason: data.blockReason || null,
        });
      });

      list.sort((a, b) => a.startTimeStr.localeCompare(b.startTimeStr));
      setSlots(list);
    } catch (err) {
      console.error("Error loading slots:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlots();
  }, [selectedDoctorId, selectedDate]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId) return;

    setIsGenerating(true);
    setMessage(null);
    try {
      const res = await apiFetch<{
        created: number;
        createdCount?: number;
        skippedExisting?: number;
        skippedPast?: number;
      }>("/api/slots/generate", {
        method: "POST",
        json: {
          doctorId: selectedDoctorId,
          dateFrom: genDateFrom,
          dateTo: genDateTo,
          blocks: [{ start: startHour, end: endHour }],
          slotMinutes: Number(slotDuration),
        },
      });

      const count = res.created ?? res.createdCount ?? 0;
      let note = `Successfully generated ${count} slots.`;
      if (res.skippedExisting) note += ` (${res.skippedExisting} existing skipped)`;
      if (res.skippedPast) note += ` (${res.skippedPast} past skipped)`;
      setMessage(note);
      setShowGenModal(false);
      await loadSlots();
    } catch (err: unknown) {
      setMessage(`Error: ${err instanceof Error ? err.message : "Failed to generate slots"}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleBlock = async (slot: SlotItem) => {
    const isBlocking = slot.status !== "BLOCKED";
    const reason = isBlocking ? prompt("Enter reason for blocking slot:") : undefined;
    if (isBlocking && !reason) return;

    try {
      await apiFetch(`/api/slots/${slot.id}/block`, {
        method: "PUT",
        json: {
          blocked: isBlocking,
        },
      });
      await loadSlots();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to toggle slot block");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary-700" />
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Hospital Slot Administration
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Batch-generate booking slots or hold/block slots across any hospital doctor.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowGenModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-700 hover:bg-primary-800 text-white rounded-xl text-xs font-bold shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Generate Slot Schedule</span>
        </button>
      </div>

      {message && (
        <div className="p-3.5 bg-primary-50 border border-primary-200 rounded-xl text-primary-900 text-xs font-medium flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="font-bold text-primary-700">Dismiss</button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            Consultant Doctor
          </label>
          <select
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            className="w-full p-2 text-xs border rounded-xl bg-white font-semibold text-gray-800"
          >
            {doctors.map((d) => (
              <option key={d.uid} value={d.uid}>{d.displayName}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            Clinic Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="p-2 text-xs border rounded-xl"
          />
        </div>
      </div>

      {/* Slots Grid */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-gray-900 text-sm">
          Slots for {selectedDate} ({slots.length})
        </h3>

        {loading ? (
          <div className="py-12 text-center text-gray-400">Loading slots...</div>
        ) : slots.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Clock className="w-8 h-8 mx-auto text-gray-300 mb-1" />
            <p className="text-xs">No slots created for this doctor on {selectedDate}.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {slots.map((s) => (
              <div
                key={s.id}
                className={`p-3 rounded-xl border text-center transition-colors ${
                  s.status === "AVAILABLE"
                    ? "bg-emerald-50/40 border-emerald-200 text-emerald-950"
                    : s.status === "BOOKED"
                    ? "bg-blue-50/40 border-blue-200 text-blue-950"
                    : "bg-gray-100 border-gray-200 text-gray-500"
                }`}
              >
                <div className="font-mono font-bold text-xs">{s.startTimeStr} - {s.endTimeStr}</div>
                <div className="text-[10px] font-bold mt-1 uppercase">
                  {s.status}
                </div>

                {s.status !== "BOOKED" && (
                  <button
                    type="button"
                    onClick={() => handleToggleBlock(s)}
                    className="mt-2 text-[10px] font-semibold text-gray-600 hover:text-gray-900 underline block mx-auto"
                  >
                    {s.status === "BLOCKED" ? "Unblock" : "Block"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate Schedule Modal */}
      {showGenModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Generate Slot Schedule</h3>
              <button onClick={() => setShowGenModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">From Date</label>
                  <input
                    type="date"
                    required
                    value={genDateFrom}
                    onChange={(e) => setGenDateFrom(e.target.value)}
                    className="w-full p-2 text-xs border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">To Date</label>
                  <input
                    type="date"
                    required
                    value={genDateTo}
                    onChange={(e) => setGenDateTo(e.target.value)}
                    className="w-full p-2 text-xs border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Shift Start</label>
                  <input
                    type="time"
                    required
                    value={startHour}
                    onChange={(e) => setStartHour(e.target.value)}
                    className="w-full p-2 text-xs border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Shift End</label>
                  <input
                    type="time"
                    required
                    value={endHour}
                    onChange={(e) => setEndHour(e.target.value)}
                    className="w-full p-2 text-xs border rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Slot Length (Minutes)</label>
                <select
                  value={slotDuration}
                  onChange={(e) => setSlotDuration(Number(e.target.value))}
                  className="w-full p-2 text-xs border rounded-xl bg-white"
                >
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes (Standard)</option>
                  <option value={20}>20 minutes</option>
                  <option value={30}>30 minutes</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGenModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-5 py-2 bg-primary-700 text-white rounded-xl text-xs font-bold"
                >
                  {isGenerating ? "Generating..." : "Generate Slots"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
