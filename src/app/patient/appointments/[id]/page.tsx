"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { apiFetch } from "@/lib/api/client-fetch";
import { todayKey } from "@/lib/time";
import { StatusBadge, EmergencyFlagBadge } from "@/components/shared/badges";
import {
  ArrowLeft,
  Clock,
  Stethoscope,
  Users,
  AlertTriangle,
  CheckCircle2,
  Calendar,
} from "lucide-react";

export default function PatientAppointmentDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [appt, setAppt] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Queue status polled metrics
  const [queueStatus, setQueueStatus] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "appointments", id), (snap) => {
      if (snap.exists()) {
        setAppt({ id: snap.id, ...snap.data() });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  // Poll queue status while CHECKED_IN or IN_PROGRESS
  useEffect(() => {
    if (!appt || (appt.status !== "CHECKED_IN" && appt.status !== "IN_PROGRESS")) {
      return;
    }

    async function fetchQueueStatus() {
      try {
        const res = await apiFetch<any>(`/appointments/${id}/queue-status`);
        setQueueStatus(res);
      } catch (err) {
        console.error("Queue status polling error:", err);
      }
    }

    fetchQueueStatus();
    const interval = setInterval(fetchQueueStatus, 30000); // 30s poll
    return () => clearInterval(interval);
  }, [id, appt?.status]);

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      await apiFetch(`/appointments/${id}/check-in`, { method: "PUT" });
    } catch (err: any) {
      alert(err.message || "Failed to check in");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    setActionLoading(true);
    try {
      await apiFetch(`/appointments/${id}/cancel`, {
        method: "PUT",
        json: { reason: "Cancelled by patient" },
      });
    } catch (err: any) {
      alert(err.message || "Failed to cancel");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-ink-500">Loading appointment details...</div>;
  }

  if (!appt) {
    return (
      <div className="p-8 text-center text-xs text-ink-500">
        Appointment not found. <Link href="/patient" className="text-primary-700 underline">Return to Dashboard</Link>
      </div>
    );
  }

  const today = todayKey();
  const isToday = appt.dateKey === today;
  const canCheckIn = appt.status === "BOOKED" && isToday;
  const canCancel = appt.status === "BOOKED" || appt.status === "CHECKED_IN";
  const isInConsultation = appt.status === "IN_PROGRESS";
  const isWaiting = appt.status === "CHECKED_IN";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-3">
        <Link
          href="/patient/appointments"
          className="p-1.5 rounded-lg border border-line-300 bg-surface text-ink-600 hover:text-ink-900"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-ink-900 tracking-tight">
            Consultation Details
          </h1>
          <p className="text-xs text-ink-600">ID: {appt.id}</p>
        </div>
      </div>

      {/* Main Appointment Card */}
      <div className="bg-surface border border-line-300 rounded-xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-line-300">
          <div>
            <h2 className="text-lg font-bold text-ink-900 flex items-center">
              <Stethoscope className="w-5 h-5 mr-2 text-primary-700" />
              {appt.doctorName}
            </h2>
            <p className="text-xs text-ink-600 mt-0.5">{appt.specializationName}</p>
          </div>

          <div className="flex items-center space-x-2">
            <StatusBadge status={appt.status} />
            {appt.emergencyFlag && <EmergencyFlagBadge />}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-ink-500 block">Scheduled Date</span>
            <span className="font-semibold text-ink-900 flex items-center mt-0.5">
              <Calendar className="w-3.5 h-3.5 mr-1 text-ink-400" />
              {appt.dateKey}
            </span>
          </div>

          <div>
            <span className="text-ink-500 block">Booking Type</span>
            <span className="font-semibold text-ink-900 mt-0.5 block">
              {appt.type}
            </span>
          </div>
        </div>

        {/* Emergency Advisory if Flagged */}
        {appt.emergencyFlag && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-950 text-xs flex items-start space-x-2.5">
            <AlertTriangle className="w-5 h-5 text-red-700 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block text-red-900">Emergency Priority Flagged</span>
              <p className="text-[11px] leading-relaxed">
                If symptoms escalate, please proceed to the nearest emergency department or contact 112 immediately.
              </p>
            </div>
          </div>
        )}

        {/* Live Queue Position Card (DOC_6 Section 7.4) */}
        {isWaiting && (
          <div className="p-5 rounded-xl bg-teal-50 border-2 border-primary-700 text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-800 block">
              Your Current Place in the Live Queue
            </span>

            {queueStatus?.position ? (
              <div className="space-y-1">
                <div className="text-4xl font-extrabold text-primary-800 tracking-tight">
                  #{queueStatus.position}
                </div>
                <div className="text-xs font-semibold text-ink-900">
                  {queueStatus.patientsAhead} {queueStatus.patientsAhead === 1 ? "patient" : "patients"} ahead of you
                </div>
                <div className="text-xs text-ink-600">
                  Estimated wait time: ~<strong>{queueStatus.estimatedWaitMinutes} minutes</strong>
                </div>
              </div>
            ) : (
              <div className="text-xs text-ink-600 py-2">
                Calculating your live place in queue...
              </div>
            )}

            <p className="text-[11px] text-ink-500 italic pt-1 border-t border-teal-200">
              Your position can adjust dynamically as more urgent patients or emergency walk-ins arrive.
            </p>
          </div>
        )}

        {/* In-Consultation Banner */}
        {isInConsultation && (
          <div className="p-5 rounded-xl bg-indigo-50 border-2 border-indigo-500 text-center space-y-2">
            <span className="text-lg font-bold text-indigo-900 block">
              It is your turn!
            </span>
            <p className="text-xs text-indigo-800">
              The doctor is ready for you. Please proceed to the consultation room.
            </p>
          </div>
        )}

        {/* Action Controls */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          {canCheckIn && (
            <button
              onClick={handleCheckIn}
              disabled={actionLoading}
              className="flex-1 py-3 px-4 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-xs flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{actionLoading ? "Checking in..." : "Check In on Arrival"}</span>
            </button>
          )}

          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className="py-2.5 px-4 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold"
            >
              Cancel Appointment
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
