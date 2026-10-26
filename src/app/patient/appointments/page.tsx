"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useSession } from "@/features/auth/auth-context";
import { apiFetch } from "@/lib/api/client-fetch";
import { todayKey } from "@/lib/time";
import { StatusBadge, EmergencyFlagBadge } from "@/components/shared/badges";
import { Calendar, Clock, Stethoscope, ArrowRight, Ban, CheckCircle2 } from "lucide-react";

export default function MyAppointmentsPage() {
  const session = useSession();
  const uid = session.status === "ready" ? session.user.uid : "";

  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(db, "appointments"),
      where("patientUid", "==", uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a: any, b: any) => {
          const timeA = a.bookingTime?.toMillis?.() ?? (a.bookingTime?._seconds ? a.bookingTime._seconds * 1000 : 0);
          const timeB = b.bookingTime?.toMillis?.() ?? (b.bookingTime?._seconds ? b.bookingTime._seconds * 1000 : 0);
          return timeB - timeA;
        });
        setAppointments(list);
        setLoading(false);
      },
      (err) => {
        console.error("Appointments snapshot error:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  const handleCheckIn = async (id: string) => {
    setActionLoading(id);
    try {
      await apiFetch(`/appointments/${id}/check-in`, { method: "PUT" });
    } catch (err: any) {
      alert(err.message || "Failed to check in");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    setActionLoading(id);
    try {
      await apiFetch(`/appointments/${id}/cancel`, {
        method: "PUT",
        json: { reason: "Cancelled by patient from portal" },
      });
    } catch (err: any) {
      alert(err.message || "Failed to cancel");
    } finally {
      setActionLoading(null);
    }
  };

  const today = todayKey();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-line-300">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight">
            My Appointments
          </h1>
          <p className="text-xs text-ink-600 mt-0.5">
            Track your consultations, check in on arrival, and view your live place in the queue.
          </p>
        </div>

        <Link
          href="/patient/book"
          className="px-4 py-2 rounded-lg bg-primary-700 hover:bg-primary-800 text-white text-xs font-semibold shadow-xs"
        >
          Book New
        </Link>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="p-8 text-center text-xs text-ink-500 bg-surface rounded-xl border border-line-300">
            Loading your appointments...
          </div>
        ) : appointments.length === 0 ? (
          <div className="p-12 text-center text-xs text-ink-500 bg-surface rounded-xl border border-line-300 space-y-3">
            <Calendar className="w-8 h-8 text-ink-400 mx-auto" />
            <p className="font-medium text-ink-900">No scheduled appointments found.</p>
            <Link
              href="/patient/book"
              className="inline-block px-4 py-2 rounded-lg bg-primary-700 text-white text-xs font-semibold"
            >
              Book Your First Consultation
            </Link>
          </div>
        ) : (
          appointments.map((appt) => {
            const isToday = appt.dateKey === today;
            const canCheckIn = appt.status === "BOOKED" && isToday;
            const canCancel = appt.status === "BOOKED" || appt.status === "CHECKED_IN";
            const isWaiting = appt.status === "CHECKED_IN" || appt.status === "IN_PROGRESS";

            return (
              <div
                key={appt.id}
                className="bg-surface border border-line-300 rounded-xl p-5 shadow-xs space-y-4 hover:border-slate-400 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line-300">
                  <div className="flex items-center space-x-2">
                    <StatusBadge status={appt.status} />
                    {appt.emergencyFlag && <EmergencyFlagBadge />}
                  </div>
                  <span className="text-xs text-ink-500">
                    Date: <strong>{appt.dateKey}</strong>
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-base text-ink-900 flex items-center">
                      <Stethoscope className="w-4 h-4 mr-1.5 text-primary-700" />
                      {appt.doctorName}
                    </h3>
                    <p className="text-xs text-ink-600 mt-0.5">
                      {appt.specializationName} &bull; Type: {appt.type}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    {canCheckIn && (
                      <button
                        onClick={() => handleCheckIn(appt.id)}
                        disabled={actionLoading === appt.id}
                        className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-xs flex items-center space-x-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Check In Now</span>
                      </button>
                    )}

                    {isWaiting && (
                      <Link
                        href={`/patient/appointments/${appt.id}`}
                        className="px-4 py-2 rounded-lg bg-primary-700 hover:bg-primary-800 text-white text-xs font-semibold shadow-xs flex items-center space-x-1"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Track Queue Place</span>
                      </Link>
                    )}

                    {canCancel && (
                      <button
                        onClick={() => handleCancel(appt.id)}
                        disabled={actionLoading === appt.id}
                        className="px-3 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold"
                      >
                        Cancel
                      </button>
                    )}

                    <Link
                      href={`/patient/appointments/${appt.id}`}
                      className="p-2 text-ink-500 hover:text-ink-900"
                      title="View details"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
