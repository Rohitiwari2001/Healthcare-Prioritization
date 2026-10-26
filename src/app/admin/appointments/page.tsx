"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { todayKey, formatTime } from "@/lib/time";
import { StatusBadge, SourceBadge } from "@/components/shared/badges";
import { Calendar, Filter, RefreshCw, ChevronRight } from "lucide-react";

interface AdminApptItem {
  id: string;
  patientName: string;
  patientAge: number;
  doctorName?: string;
  status: string;
  source: "ONLINE" | "RECEPTION" | "WALK_IN";
  baseScore: number;
  dateKey: string;
  scheduledStartAt?: string | null;
  emergencyFlag: boolean;
}

export default function AdminAppointmentsPage() {
  const [selectedDate, setSelectedDate] = useState<string>(todayKey());
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [appointments, setAppointments] = useState<AdminApptItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      let q = query(
        collection(db, "appointments"),
        where("dateKey", "==", selectedDate)
      );

      const snap = await getDocs(q);
      const items: AdminApptItem[] = [];

      snap.forEach((d) => {
        const data = d.data();
        if (statusFilter === "ALL" || data.status === statusFilter) {
          items.push({
            id: d.id,
            patientName: data.patientName || "Unknown",
            patientAge: data.patientAge ?? 0,
            doctorName: data.doctorName || "Doctor",
            status: data.status,
            source: data.source || "ONLINE",
            baseScore: data.baseScore ?? 0,
            dateKey: data.dateKey,
            scheduledStartAt: data.scheduledStartAt?.toDate?.()?.toISOString() ?? null,
            emergencyFlag: !!data.emergencyFlag,
          });
        }
      });

      items.sort((a, b) => {
        const tA = a.scheduledStartAt ? new Date(a.scheduledStartAt).getTime() : 0;
        const tB = b.scheduledStartAt ? new Date(b.scheduledStartAt).getTime() : 0;
        return tA - tB;
      });

      setAppointments(items);
    } catch (err) {
      console.error("Error fetching appointments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate, statusFilter]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Hospital Appointment Ledger
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Audit and inspect outpatient encounters across all clinic specialties and doctors.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
            />
            <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-3 text-xs border border-gray-300 rounded-xl bg-white text-gray-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="BOOKED">BOOKED</option>
            <option value="CHECKED_IN">CHECKED_IN</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="NO_SHOW">NO_SHOW</option>
          </select>

          <button
            type="button"
            onClick={fetchAppointments}
            className="p-2 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-gray-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary-600" />
            <p className="text-xs">Loading appointments for {selectedDate}...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="py-12 text-center text-gray-400 space-y-2">
            <Calendar className="w-8 h-8 mx-auto text-gray-300" />
            <p className="font-semibold text-gray-700">No appointments recorded for {selectedDate}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Consultant Doctor</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Base Score</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {appointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-gray-700">
                      {appt.scheduledStartAt ? formatTime(appt.scheduledStartAt) : "Walk-in"}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      {appt.patientName} ({appt.patientAge}y)
                    </td>
                    <td className="py-3.5 px-4 text-gray-700">
                      {appt.doctorName}
                    </td>
                    <td className="py-3.5 px-4">
                      <SourceBadge source={appt.source} />
                    </td>
                    <td className="py-3.5 px-4 font-bold text-primary-800">
                      {appt.baseScore} pts
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={appt.status} />
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
