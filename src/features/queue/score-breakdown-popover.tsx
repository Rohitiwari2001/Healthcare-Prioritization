"use client";

import { useState } from "react";
import { Info, AlertTriangle, Clock } from "lucide-react";
import { LiveQueueAppointment } from "./use-live-queue";
import { PriorityConfigParams } from "@/lib/priority-engine/types";

interface Props {
  appointment: LiveQueueAppointment;
  config: PriorityConfigParams;
  now: number;
}

export function ScoreBreakdownPopover({ appointment, config, now }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const checkInMs = appointment.checkInTime ? new Date(appointment.checkInTime).getTime() : now;
  const waitMinutes = Math.max(0, Math.floor((now - checkInMs) / 60000));

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-semibold bg-primary-50 text-primary-800 border border-primary-200 hover:bg-primary-100 transition-colors"
        title="View priority score breakdown"
      >
        <span>{appointment.finalScore.toFixed(1)}</span>
        <Info className="w-3.5 h-3.5 text-primary-600" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50 text-xs text-gray-700 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-3">
              <span className="font-bold text-sm text-gray-900">Score Breakdown</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary-100 text-primary-800">
                Final: {appointment.finalScore.toFixed(1)}
              </span>
            </div>

            {appointment.emergencyFlag && (
              <div className="mb-3 p-2 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Emergency Red Flag:</strong> Evaluated with Critical severity (100 pts)
                </span>
              </div>
            )}

            <div className="space-y-2 mb-3">
              <div className="flex justify-between items-center text-gray-600 font-medium">
                <span>Base Clinical Score:</span>
                <span className="font-semibold text-gray-900">{appointment.baseScore} pts</span>
              </div>
              <div className="pl-3 border-l-2 border-gray-200 space-y-1 text-gray-500">
                <div className="flex justify-between">
                  <span>Severity component:</span>
                  <span>+{appointment.breakdown?.severityPts ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Age bracket component:</span>
                  <span>+{appointment.breakdown?.agePts ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Urgency component:</span>
                  <span>+{appointment.breakdown?.urgencyPts ?? 0}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-3 pt-2 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1 font-medium text-gray-600">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  Dynamic Aging ({waitMinutes}m):
                </span>
                <span className="font-semibold text-emerald-700">
                  +{appointment.aging.toFixed(1)} pts
                </span>
              </div>
              <p className="text-[11px] text-gray-400 pl-4">
                +1 pt per {config.aging.divisorMinutes}m (max {config.aging.cap} pts)
              </p>
            </div>

            {appointment.manualAdjustment ? (
              <div className="space-y-1 pt-2 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-amber-700">Doctor Override:</span>
                  <span className="font-bold text-amber-800">
                    {appointment.manualAdjustment > 0 ? `+${appointment.manualAdjustment}` : appointment.manualAdjustment} pts
                  </span>
                </div>
                {appointment.overrideReason && (
                  <p className="text-[11px] italic bg-amber-50 p-1.5 rounded border border-amber-200 text-amber-900">
                    &quot;{appointment.overrideReason}&quot;
                  </p>
                )}
              </div>
            ) : null}

            <div className="mt-3 pt-2 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-xs text-primary-700 hover:text-primary-900 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
