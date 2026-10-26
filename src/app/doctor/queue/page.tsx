"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/features/auth/auth-context";
import { useCan } from "@/features/auth/area-gate";
import { useLiveQueue, LiveQueueAppointment } from "@/features/queue/use-live-queue";
import { useAutoSweep } from "@/features/queue/use-auto-sweep";
import { QueueTable } from "@/features/queue/queue-table";
import { apiFetch } from "@/lib/api/client";
import { Users, AlertCircle, RefreshCw } from "lucide-react";

export default function DoctorLiveQueuePage() {
  const router = useRouter();
  const session = useSession();
  useAutoSweep();

  const doctorUid = session.status === "ready" ? session.user.uid : null;
  const canOverride = useCan("priority.override");
  const canViewBreakdown = useCan("queue.view_breakdown");

  const { queue, loading, error, now, configParams } = useLiveQueue(doctorUid);
  const [callError, setCallError] = useState<string | null>(null);

  const handleCallPatient = async (appt: LiveQueueAppointment) => {
    setCallError(null);
    try {
      await apiFetch(`/api/appointments/${appt.id}/start`, {
        method: "PUT",
      });
      router.push(`/doctor/consultation/${appt.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to call patient";
      setCallError(msg);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Live Prioritized Queue
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Dynamic triage ordering: Clinical Base Score + Waiting Aging + Manual Override. Aging updates every 30s.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-gray-400 animate-spin" />
            Live Sync Active
          </span>
        </div>
      </div>

      {callError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{callError}</span>
          </div>
          <button
            type="button"
            onClick={() => setCallError(null)}
            className="text-xs font-semibold text-rose-700 hover:text-rose-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary-600" />
          <p className="font-medium text-sm text-gray-600">Loading today&apos;s live queue...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-800 space-y-2">
          <AlertCircle className="w-8 h-8 mx-auto text-red-600" />
          <p className="font-semibold text-sm">Failed to connect to live queue listener</p>
          <p className="text-xs text-red-600">{error}</p>
        </div>
      ) : (
        <QueueTable
          queue={queue}
          config={configParams}
          now={now}
          isDoctorView={true}
          canOverride={canOverride}
          canViewBreakdown={canViewBreakdown}
          onCallPatient={handleCallPatient}
        />
      )}
    </div>
  );
}
