"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useSession } from "@/features/auth/auth-context";
import { todayKey, formatTime } from "@/lib/time";
import { StatusBadge, SourceBadge } from "@/components/shared/badges";
import { Calendar, Clock, RefreshCw, Stethoscope, ChevronRight } from "lucide-react";

interface DoctorApptItem {
  id: string;
  patientName: string;
  patientAge: number;
  patientGender?: string;
  status: string;
  source: "ONLINE" | "RECEPTION" | "WALK_IN";
  baseScore: number;
  scheduledStartAt?: string | null;
  bookingTime?: string | null;
  dateKey: string;
}

export default function DoctorAppointmentsPage() {
  const session = useSession();
  const doctorUid = session.status === "ready" ? session.user.uid : null;

  const [selectedDate, setSelectedDate] = useState<string>(todayKey());
  const [appointments, setAppointments] = useState<DoctorApptItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = async (date: string, docUid: string) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "appointments"),
        where("doctorId", "==", docUid),
        where("dateKey", "==", date)
      );

      const snap = await getDocs(q);
      const items: DoctorApptItem[] = [];

      snap.forEach((d) => {
        const data = d.data();
        items.push({
          id: d.id,
          patientName: data.patientName || "Unknown",
          patientAge: data.patientAge ?? 0,
          patientGender: data.patientGender,
          status: data.status,
          source: data.source || "ONLINE",
          baseScore: data.baseScore ?? 0,
          scheduledStartAt: data.scheduledStartAt?.toDate?.()?.toISOString() ?? null,
          bookingTime: data.bookingTime?.toDate?.()?.toISOString() ?? null,
          dateKey: data.dateKey,
        });
      });

      // Sort in-memory by scheduled time or booking time
      items.sort((a, b) => {
        const timeA = a.scheduledStartAt ? new Date(a.scheduledStartAt).getTime() : 0;
        const timeB = b.scheduledStartAt ? new Date(b.scheduledStartAt).getTime() : 0;
        return timeA - timeB;
      });

      setAppointments(items);
    } catch (err) {
      console.error("Error fetching appointments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (doctorUid) {
      fetchAppointments(selectedDate, doctorUid);
    }
  }, [doctorUid, selectedDate]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Doctor Appointments Schedule
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            View full daily appointment rosters, scheduled slots, and completed consultations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
            />
            <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <button
            type="button"
            onClick={() => doctorUid && fetchAppointments(selectedDate, doctorUid)}
            className="p-2 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-gray-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary-600" />
            <p className="text-sm">Loading appointments for {selectedDate}...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="py-12 text-center text-gray-400 space-y-2">
            <Clock className="w-8 h-8 mx-auto text-gray-300" />
            <p className="font-semibold text-gray-700">No appointments scheduled for {selectedDate}</p>
            <p className="text-xs text-gray-400">Patients will appear here once booked or checked-in.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Base Score</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
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
                    <td className="py-3.5 px-4">
                      <SourceBadge source={appt.source} />
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-primary-800">
                      {appt.baseScore} pts
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={appt.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {appt.status === "IN_PROGRESS" || appt.status === "COMPLETED" ? (
                        <Link
                          href={`/doctor/consultation/${appt.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-900"
                        >
                          <Stethoscope className="w-3.5 h-3.5" />
                          <span>{appt.status === "IN_PROGRESS" ? "Resume" : "View Record"}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : null}
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
