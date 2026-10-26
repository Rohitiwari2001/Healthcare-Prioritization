"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { apiFetch } from "@/lib/api/client";
import { 
  Calendar, 
  User, 
  Clock, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  FileText,
  Flame,
  ShieldCheck
} from "lucide-react";
import { StatusBadge, SourceBadge } from "@/components/shared/badges";
import { formatTime, todayKey } from "@/lib/time";

export default function ReceptionAppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: appointmentId } = use(params);

  const [appt, setAppt] = useState<any>(null);
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, "appointments", appointmentId));
      if (!snap.exists()) {
        setError("Appointment not found");
        setLoading(false);
        return;
      }
      setAppt({ id: snap.id, ...snap.data() });

      const assessSnap = await getDoc(
        doc(db, "appointments", appointmentId, "clinical", "assessment")
      );
      if (assessSnap.exists()) {
        setAssessment(assessSnap.data());
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load appointment");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [appointmentId]);

  const handleCheckIn = async () => {
    setActionLoading(true);
    setActionMsg(null);
    try {
      await apiFetch(`/api/appointments/${appointmentId}/check-in`, { method: "PUT" });
      setActionMsg("Patient successfully checked in!");
      await loadData();
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this appointment on behalf of the patient?")) {
      return;
    }
    setActionLoading(true);
    setActionMsg(null);
    try {
      await apiFetch(`/api/appointments/${appointmentId}/cancel`, {
        method: "PUT",
        body: JSON.stringify({ reason: "Cancelled by reception staff" }),
      });
      setActionMsg("Appointment cancelled and slot released.");
      await loadData();
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : "Cancellation failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-gray-500">
        <Calendar className="w-8 h-8 animate-pulse mx-auto text-primary-600 mb-2" />
        <p className="text-sm">Loading appointment details...</p>
      </div>
    );
  }

  if (error || !appt) {
    return (
      <div className="max-w-4xl mx-auto bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-800">
        <AlertTriangle className="w-8 h-8 mx-auto text-red-600 mb-2" />
        <h3 className="font-bold">{error || "Appointment not found"}</h3>
        <Link href="/reception" className="mt-4 inline-flex items-center text-sm font-semibold text-primary-700">
          <ArrowLeft className="w-4 h-4 mr-1" /> Return to Reception Desk
        </Link>
      </div>
    );
  }

  const isToday = appt.dateKey === todayKey();
  const canCheckIn = appt.status === "BOOKED" && isToday;
  const canCancel = appt.status === "BOOKED" || appt.status === "CHECKED_IN";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/reception"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Reception Desk</span>
      </Link>

      {actionMsg && (
        <div className="p-4 bg-primary-50 border border-primary-200 rounded-2xl text-primary-900 text-sm flex items-center justify-between">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-xs font-bold text-primary-700">Dismiss</button>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{appt.patientName}</h1>
              {appt.patientCode && (
                <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  {appt.patientCode}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Date: <strong className="text-gray-700">{appt.dateKey}</strong> &bull; Slot: <strong className="text-gray-700">{appt.scheduledStartAt ? formatTime(appt.scheduledStartAt.toDate()) : "Walk-in"}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={appt.status} />
            <SourceBadge source={appt.source} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-gray-50 rounded-xl">
            <span className="text-gray-400 block mb-0.5 uppercase tracking-wider font-bold">Doctor</span>
            <span className="font-bold text-gray-900 text-sm">{appt.doctorName}</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl">
            <span className="text-gray-400 block mb-0.5 uppercase tracking-wider font-bold">Base Priority</span>
            <span className="font-bold text-primary-700 text-sm">{appt.baseScore} points</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl">
            <span className="text-gray-400 block mb-0.5 uppercase tracking-wider font-bold">Emergency Flag</span>
            <span className={`font-bold text-sm ${appt.emergencyFlag ? "text-rose-600" : "text-gray-700"}`}>
              {appt.emergencyFlag ? "Emergency Present" : "Standard Triage"}
            </span>
          </div>
        </div>

        {/* Symptoms Summary */}
        {assessment && (
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-2">
            <div className="font-bold text-gray-900 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-primary-700" />
              <span>Intake Assessment</span>
            </div>
            <p className="text-gray-700"><strong>Chief Complaint:</strong> {assessment.chiefComplaint}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {assessment.symptoms?.map((s: string) => (
                <span key={s} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[11px] text-gray-700">
                  {s.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Desk Actions */}
        <div className="pt-2 flex flex-wrap items-center justify-end gap-3">
          {canCancel && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleCancel}
              className="px-4 py-2 border border-red-200 text-red-700 hover:bg-red-50 rounded-xl text-xs font-bold transition-colors"
            >
              Cancel Appointment
            </button>
          )}

          {canCheckIn && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleCheckIn}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{actionLoading ? "Processing..." : "Check In Patient Now"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
