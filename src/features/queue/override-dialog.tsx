"use client";

import { useState } from "react";
import { AlertCircle, ShieldAlert, X } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { LiveQueueAppointment } from "./use-live-queue";

interface Props {
  appointment: LiveQueueAppointment;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function OverrideDialog({ appointment, isOpen, onClose, onSuccess }: Props) {
  const currentVal = appointment.manualAdjustment ?? 0;
  const [adjustment, setAdjustment] = useState<number>(currentVal);
  const [reason, setReason] = useState<string>(appointment.overrideReason || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (adjustment === currentVal) {
      setError("The new priority adjustment must differ from current value (" + currentVal + ").");
      return;
    }

    if (reason.trim().length < 10) {
      setError("Please provide a clinical reason of at least 10 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch(`/api/appointments/${appointment.id}/override`, {
        method: "POST",
        body: JSON.stringify({
          manualAdjustment: Number(adjustment),
          reason: reason.trim(),
        }),
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to override priority";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center gap-2 text-amber-900">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-base">Priority Score Override</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-sm">
            <div className="font-semibold text-gray-900">{appointment.patientName}</div>
            <div className="text-gray-500 text-xs mt-0.5">
              Current Base Score: {appointment.baseScore} | Current Override: {currentVal > 0 ? `+${currentVal}` : currentVal} pts
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              New Adjustment Points (-50 to +50)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="-50"
                max="50"
                step="5"
                value={adjustment}
                onChange={(e) => setAdjustment(Number(e.target.value))}
                className="w-full accent-amber-600"
              />
              <span className={`w-14 text-center font-bold text-sm py-1 px-2 rounded-lg border ${
                adjustment > 0
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : adjustment < 0
                  ? "bg-rose-50 text-rose-800 border-rose-200"
                  : "bg-gray-100 text-gray-700 border-gray-200"
              }`}>
                {adjustment > 0 ? `+${adjustment}` : adjustment}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Positive values advance patient; negative values lower urgency.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Mandatory Clinical Reason (10 - 300 characters)
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Patient appeared visibly distressed with labored breathing in waiting area..."
              className="w-full p-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              maxLength={300}
            />
            <div className="flex justify-between text-[11px] text-gray-400 mt-1">
              <span>{reason.length < 10 ? `${10 - reason.length} more characters needed` : "Reason logged to audit trail"}</span>
              <span>{reason.length}/300</span>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || adjustment === currentVal || reason.trim().length < 10}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "Saving..." : "Apply Override"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
