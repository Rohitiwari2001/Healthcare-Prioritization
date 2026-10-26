"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  AlertTriangle, 
  Clock, 
  Stethoscope, 
  UserCheck, 
  SlidersHorizontal,
  Flame,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { SourceBadge } from "@/components/shared/badges";
import { ScoreBreakdownPopover } from "./score-breakdown-popover";
import { OverrideDialog } from "./override-dialog";
import { LiveQueueAppointment } from "./use-live-queue";
import { PriorityConfigParams } from "@/lib/priority-engine/types";

interface Props {
  queue: LiveQueueAppointment[];
  config: PriorityConfigParams;
  now: number;
  isDoctorView?: boolean;
  canOverride?: boolean;
  canViewBreakdown?: boolean;
  onCallPatient?: (appt: LiveQueueAppointment) => Promise<void>;
}

export function QueueTable({
  queue,
  config,
  now,
  isDoctorView = false,
  canOverride = false,
  canViewBreakdown = false,
  onCallPatient,
}: Props) {
  const [overrideAppt, setOverrideAppt] = useState<LiveQueueAppointment | null>(null);
  const [callingId, setCallingId] = useState<string | null>(null);

  const inProgress = queue.find((a) => a.status === "IN_PROGRESS");
  const waiting = queue.filter((a) => a.status === "CHECKED_IN");

  const handleCall = async (appt: LiveQueueAppointment) => {
    if (!onCallPatient) return;
    setCallingId(appt.id);
    try {
      await onCallPatient(appt);
    } finally {
      setCallingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Pinned IN_PROGRESS Consultation */}
      {inProgress && (
        <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border-2 border-emerald-500/30 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                <Stethoscope className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-full bg-emerald-100 text-emerald-800">
                    Current Consultation
                  </span>
                  <SourceBadge source={inProgress.source} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mt-1">
                  {inProgress.patientName}{" "}
                  <span className="text-sm font-normal text-gray-500">
                    ({inProgress.patientAge}y {inProgress.patientGender ? `• ${inProgress.patientGender}` : ""})
                  </span>
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {isDoctorView ? (
                <Link
                  href={`/doctor/consultation/${inProgress.id}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-colors"
                >
                  <span>Resume Consultation</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <span className="text-xs font-medium text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-lg">
                  In Room with Doctor
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Waiting Queue List */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary-700" />
            <h3 className="font-bold text-gray-900">
              Waiting Patients ({waiting.length})
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span>Sorted by Prioritized Urgency + Aging</span>
          </div>
        </div>

        {waiting.length === 0 ? (
          <div className="py-12 text-center text-gray-400 space-y-2">
            <Sparkles className="w-8 h-8 mx-auto text-gray-300" />
            <p className="font-medium text-sm text-gray-600">The waiting room is empty</p>
            <p className="text-xs text-gray-400">Checked-in patients will appear here in real-time order.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/75 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">Rank</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Wait Time</th>
                  <th className="py-3 px-4">Source</th>
                  {canViewBreakdown && <th className="py-3 px-4">Priority Score</th>}
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {waiting.map((appt, idx) => {
                  const rank = idx + 1;
                  const checkInMs = appt.checkInTime ? new Date(appt.checkInTime).getTime() : now;
                  const waitMinutes = Math.max(0, Math.floor((now - checkInMs) / 60000));

                  return (
                    <tr
                      key={appt.id}
                      className={`hover:bg-gray-50/80 transition-colors ${
                        appt.emergencyFlag ? "bg-rose-50/40" : ""
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-3.5 px-4 text-center font-bold text-gray-700">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs ${
                          rank === 1
                            ? "bg-primary-700 text-white font-black shadow-sm"
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {rank}
                        </span>
                      </td>

                      {/* Patient */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{appt.patientName}</span>
                          <span className="text-xs text-gray-500">
                            ({appt.patientAge}y {appt.patientGender ? `• ${appt.patientGender}` : ""})
                          </span>
                          {appt.emergencyFlag && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white uppercase tracking-wider animate-pulse">
                              <Flame className="w-3 h-3" />
                              Emergency
                            </span>
                          )}
                        </div>
                        {appt.overrideReason && (
                          <div className="text-[11px] text-amber-700 flex items-center gap-1 mt-0.5">
                            <SlidersHorizontal className="w-3 h-3" />
                            <span>Override: {appt.overrideReason}</span>
                          </div>
                        )}
                      </td>

                      {/* Wait Time */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-xs text-gray-700 font-medium">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span>{waitMinutes} mins</span>
                        </div>
                      </td>

                      {/* Source */}
                      <td className="py-3.5 px-4">
                        <SourceBadge source={appt.source} />
                      </td>

                      {/* Score Breakdown (Gated) */}
                      {canViewBreakdown && (
                        <td className="py-3.5 px-4">
                          <ScoreBreakdownPopover
                            appointment={appt}
                            config={config}
                            now={now}
                          />
                        </td>
                      )}

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canOverride && (
                            <button
                              type="button"
                              onClick={() => setOverrideAppt(appt)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                              title="Override priority score"
                            >
                              Override
                            </button>
                          )}

                          {isDoctorView && onCallPatient && (
                            <button
                              type="button"
                              disabled={callingId === appt.id || !!inProgress}
                              onClick={() => handleCall(appt)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-primary-700 hover:bg-primary-800 text-white disabled:opacity-40 transition-colors shadow-sm"
                            >
                              <span>{callingId === appt.id ? "Calling..." : "Call Patient"}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Override Dialog Modal */}
      {overrideAppt && (
        <OverrideDialog
          appointment={overrideAppt}
          isOpen={!!overrideAppt}
          onClose={() => setOverrideAppt(null)}
          onSuccess={() => setOverrideAppt(null)}
        />
      )}
    </div>
  );
}
