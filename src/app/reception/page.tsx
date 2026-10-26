"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useSession } from "@/features/auth/auth-context";
import { todayKey, formatTime } from "@/lib/time";
import { apiFetch } from "@/lib/api/client";
import { useAutoSweep } from "@/features/queue/use-auto-sweep";
import { StatusBadge, SourceBadge } from "@/components/shared/badges";
import { 
  Footprints, 
  Calendar, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  RefreshCw,
  Search
} from "lucide-react";

interface DeskAppointment {
  id: string;
  patientName: string;
  patientAge: number;
  patientGender?: string;
  doctorName?: string;
  scheduledStartAt?: string | null;
  status: string;
  source: "ONLINE" | "RECEPTION" | "WALK_IN";
  baseScore: number;
  emergencyFlag: boolean;
}

export default function ReceptionDashboard() {
  const session = useSession();
  useAutoSweep();

  const staffName =
    session.status === "ready"
      ? session.user.displayName || "Receptionist"
      : "Receptionist";

  const [appointments, setAppointments] = useState<DeskAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const today = todayKey();

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, "appointments"),
      where("dateKey", "==", today)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: DeskAppointment[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            patientName: data.patientName || "Unknown",
            patientAge: data.patientAge ?? 0,
            patientGender: data.patientGender,
            doctorName: data.doctorName || "Assigned Doctor",
            scheduledStartAt: data.scheduledStartAt?.toDate?.()?.toISOString() ?? null,
            status: data.status,
            source: data.source || "ONLINE",
            baseScore: data.baseScore ?? 0,
            emergencyFlag: !!data.emergencyFlag,
          });
        });

        // Sort: BOOKED first (by time), then others
        list.sort((a, b) => {
          if (a.status === "BOOKED" && b.status !== "BOOKED") return -1;
          if (b.status === "BOOKED" && a.status !== "BOOKED") return 1;
          const timeA = a.scheduledStartAt ? new Date(a.scheduledStartAt).getTime() : 0;
          const timeB = b.scheduledStartAt ? new Date(b.scheduledStartAt).getTime() : 0;
          return timeA - timeB;
        });

        setAppointments(list);
        setLoading(false);
      },
      (err) => {
        console.error("Reception snapshot error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [today]);

  const handleInstantCheckIn = async (appointmentId: string) => {
    setActionId(appointmentId);
    setMessage(null);
    try {
      await apiFetch(`/api/appointments/${appointmentId}/check-in`, {
        method: "PUT",
      });
      setMessage("Patient checked in and placed into doctor's prioritized queue.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to check in";
      setMessage(`Error: ${msg}`);
    } finally {
      setActionId(null);
    }
  };

  const bookedCount = appointments.filter((a) => a.status === "BOOKED").length;
  const checkedInCount = appointments.filter((a) => a.status === "CHECKED_IN").length;
  const inProgressCount = appointments.filter((a) => a.status === "IN_PROGRESS").length;
  const completedCount = appointments.filter((a) => a.status === "COMPLETED").length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Reception Desk &bull; {staffName}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Check in arriving patients, register offline walk-ins, and manage bookings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/reception/walk-in"
            className="inline-flex items-center px-4 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-800 hover:bg-gray-50 text-xs font-bold shadow-xs transition-colors"
          >
            <Footprints className="w-4 h-4 mr-1.5 text-amber-600" />
            Walk-in Entry
          </Link>

          <Link
            href="/reception/book"
            className="inline-flex items-center px-4 py-2.5 rounded-xl bg-primary-700 hover:bg-primary-800 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Calendar className="w-4 h-4 mr-1.5" />
            Book for Patient
          </Link>
        </div>
      </div>

      {/* Overview Stat Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
            Expected / Booked
          </span>
          <div className="mt-2 text-2xl font-black text-gray-900">{bookedCount}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
            In Waiting Room
          </span>
          <div className="mt-2 text-2xl font-black text-primary-700">{checkedInCount}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
            In Consultation
          </span>
          <div className="mt-2 text-2xl font-black text-emerald-700">{inProgressCount}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
            Completed Today
          </span>
          <div className="mt-2 text-2xl font-black text-gray-700">{completedCount}</div>
        </div>
      </div>

      {message && (
        <div className="p-3.5 bg-primary-50 border border-primary-200 rounded-xl text-primary-900 text-xs font-medium flex items-center justify-between">
          <span>{message}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-primary-700 font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Today's Arriving Patients / Fast Check-in Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="font-bold text-gray-900">Today&apos;s Patient Arrivals ({appointments.length})</h3>
            <p className="text-xs text-gray-500">Check in arriving patients as they reach the reception desk.</p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/reception/patients"
              className="text-xs font-semibold text-primary-700 hover:text-primary-800 flex items-center gap-1"
            >
              <Search className="w-3.5 h-3.5" /> Search Directory
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary-600" />
            <p className="text-xs">Loading appointments for today...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="py-12 text-center text-gray-400 space-y-2">
            <Clock className="w-8 h-8 mx-auto text-gray-300" />
            <p className="font-semibold text-gray-700">No appointments scheduled for today yet.</p>
            <p className="text-xs text-gray-400">Use &quot;Book for Patient&quot; or &quot;Walk-in Entry&quot; to register patients.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Slot Time</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Doctor</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Desk Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {appointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs text-gray-700 font-medium">
                      {appt.scheduledStartAt ? formatTime(appt.scheduledStartAt) : "Walk-in"}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900">{appt.patientName}</div>
                      <div className="text-xs text-gray-500">
                        {appt.patientAge}y {appt.patientGender ? `• ${appt.patientGender}` : ""}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-700">
                      {appt.doctorName}
                    </td>
                    <td className="py-3.5 px-4">
                      <SourceBadge source={appt.source} />
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={appt.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {appt.status === "BOOKED" ? (
                        <button
                          type="button"
                          disabled={actionId === appt.id}
                          onClick={() => handleInstantCheckIn(appt.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs disabled:opacity-50 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{actionId === appt.id ? "Checking In..." : "Check In"}</span>
                        </button>
                      ) : (
                        <span className="text-xs font-medium text-gray-400">
                          {appt.status === "CHECKED_IN"
                            ? "Waiting in queue"
                            : appt.status === "IN_PROGRESS"
                            ? "In consultation"
                            : "Encounter closed"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
