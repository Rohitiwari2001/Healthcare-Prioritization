"use client";

import React, { useState } from "react";
import {
  CHIEF_COMPLAINTS,
  SEVERITIES,
  ChiefComplaint,
  Severity,
  Onset,
} from "@/lib/constants/enums";
import { DEFAULT_CONFIG_PARAMS } from "@/lib/priority-engine/default-config";
import { Siren, AlertTriangle, ArrowRight, ArrowLeft } from "lucide-react";
import { SymptomAssessmentDto } from "@/lib/schemas/assessment";

const SYMPTOM_OPTIONS = [
  { code: "CHEST_PAIN", label: "Chest pain, tightness or pressure", redFlag: true },
  { code: "SEVERE_BREATHING_DIFFICULTY", label: "Severe difficulty breathing or gasping", redFlag: true },
  { code: "UNCONSCIOUS", label: "Fainting or loss of consciousness", redFlag: true },
  { code: "SEVERE_BLEEDING", label: "Severe or uncontrolled bleeding", redFlag: true },
  { code: "STROKE_SIGNS", label: "Sudden weakness, facial drooping or slurred speech", redFlag: true },
  { code: "SEIZURE", label: "Seizure or convulsions", redFlag: true },
  { code: "SEVERE_ALLERGIC_REACTION", label: "Severe allergic reaction with face/throat swelling", redFlag: true },
  { code: "SELF_HARM_THOUGHTS", label: "Thoughts of self-harm or severe distress", redFlag: true },
  { code: "HIGH_FEVER", label: "High persistent fever", redFlag: false },
  { code: "COUGH", label: "Continuous dry or productive cough", redFlag: false },
  { code: "HEADACHE", label: "Moderate to severe headache", redFlag: false },
  { code: "VOMITING", label: "Repeated vomiting or diarrhea", redFlag: false },
  { code: "ABDOMINAL_PAIN", label: "Stomach or abdominal cramps", redFlag: false },
  { code: "JOINT_PAIN", label: "Joint stiffness or swelling", redFlag: false },
];

export function SymptomWizard({
  onComplete,
  onCancel,
}: {
  onComplete: (data: SymptomAssessmentDto) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);

  // Form State
  const [chiefComplaint, setChiefComplaint] = useState<ChiefComplaint>("FEVER");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [severitySelf, setSeveritySelf] = useState<"MILD" | "MODERATE" | "SEVERE">("MILD");
  const [onset, setOnset] = useState<Onset>("GRADUAL");
  const [durationHours, setDurationHours] = useState(24);
  const [selfUrgent, setSelfUrgent] = useState(false);

  // Red-flag detection for immediate notice
  const hasRedFlag = selectedSymptoms.some((s) =>
    DEFAULT_CONFIG_PARAMS.redFlags.includes(s)
  );

  const toggleSymptom = (code: string) => {
    if (selectedSymptoms.includes(code)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== code));
    } else {
      setSelectedSymptoms([...selectedSymptoms, code]);
    }
  };

  const handleNext = () => {
    if (selectedSymptoms.length === 0) {
      alert("Please select at least one symptom or complaint.");
      return;
    }
    setStep(2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({
      chiefComplaint,
      symptoms: selectedSymptoms,
      notes: notes.trim() || undefined,
      severitySelf,
      onset,
      durationHours: Number(durationHours),
      selfUrgent,
    });
  };

  return (
    <div className="bg-surface border border-line-300 rounded-xl p-6 shadow-xs space-y-6">
      {/* Progress header */}
      <div className="flex items-center justify-between pb-3 border-b border-line-300 text-xs">
        <span className="font-semibold text-primary-700 uppercase tracking-wide">
          Symptom Assessment &bull; Step {step} of 2
        </span>
        <span className="text-ink-500">
          {step === 1 ? "Chief Complaint & Symptoms" : "Severity & Timeline"}
        </span>
      </div>

      {/* Immediate Red Flag Warning Banner (DOC_6 Section 5) */}
      {hasRedFlag && (
        <div className="p-4 rounded-xl bg-red-50 border-2 border-red-300 text-red-950 flex items-start space-x-3 shadow-xs">
          <Siren className="w-6 h-6 text-red-700 flex-shrink-0 animate-pulse mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-sm text-red-900">
              Immediate Emergency Advisory
            </h4>
            <p className="leading-relaxed">
              Your selected symptoms can indicate a critical medical emergency. Please proceed to the nearest emergency department or call <strong>112</strong> immediately.
            </p>
            <p className="text-[11px] text-red-800 italic pt-1">
              You may still proceed with this booking; your appointment will be marked as an emergency priority.
            </p>
          </div>
        </div>
      )}

      {step === 1 ? (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-900 mb-1">
              Main Chief Complaint <span className="text-red-500">*</span>
            </label>
            <select
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value as ChiefComplaint)}
              className="w-full px-3 py-2.5 rounded-lg border border-line-300 text-sm text-ink-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-700"
            >
              {CHIEF_COMPLAINTS.map((c) => (
                <option key={c} value={c}>
                  {c.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-900 mb-2">
              Select all symptoms you are experiencing <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {SYMPTOM_OPTIONS.map((item) => {
                const checked = selectedSymptoms.includes(item.code);
                return (
                  <label
                    key={item.code}
                    className={`flex items-start space-x-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      checked
                        ? item.redFlag
                          ? "bg-red-50 border-red-300 text-red-950 font-medium"
                          : "bg-teal-50 border-primary-700 text-primary-950 font-medium"
                        : "border-line-300 hover:bg-slate-50 text-ink-900"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSymptom(item.code)}
                      className="mt-0.5 rounded border-line-300 text-primary-700 focus:ring-primary-700"
                    />
                    <span className="leading-snug">{item.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-900 mb-1">
              Additional notes or context (optional)
            </label>
            <textarea
              rows={2}
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe when symptoms started or any specific details..."
              className="w-full px-3 py-2 rounded-lg border border-line-300 text-xs text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
            />
          </div>

          <div className="pt-2 flex justify-between">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg border border-line-300 text-xs text-ink-600 hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2 rounded-lg bg-primary-700 hover:bg-primary-800 text-white text-xs font-semibold flex items-center space-x-1"
            >
              <span>Continue to Severity</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-900 mb-2">
              How severe does it feel? <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(["MILD", "MODERATE", "SEVERE"] as const).map((sev) => (
                <button
                  type="button"
                  key={sev}
                  onClick={() => setSeveritySelf(sev)}
                  className={`py-3 px-3 rounded-lg border text-xs font-semibold transition-all ${
                    severitySelf === sev
                      ? "border-primary-700 bg-primary-50 text-primary-900 ring-2 ring-primary-700"
                      : "border-line-300 text-ink-600 hover:bg-slate-50"
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-900 mb-1">
                Onset Timing <span className="text-red-500">*</span>
              </label>
              <select
                value={onset}
                onChange={(e) => setOnset(e.target.value as Onset)}
                className="w-full px-3 py-2 rounded-lg border border-line-300 text-xs text-ink-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-700"
              >
                <option value="SUDDEN">Sudden (started abruptly)</option>
                <option value="GRADUAL">Gradual (developed slowly)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-900 mb-1">
                Duration (Hours) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                max={8760}
                required
                value={durationHours}
                onChange={(e) => setDurationHours(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2 rounded-lg border border-line-300 text-xs text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-line-300 rounded-lg">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={selfUrgent}
                onChange={(e) => setSelfUrgent(e.target.checked)}
                className="rounded border-line-300 text-primary-700 focus:ring-primary-700"
              />
              <span className="text-xs font-medium text-ink-900">
                I feel this condition is urgent and requires immediate attention.
              </span>
            </label>
          </div>

          <div className="pt-2 flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-lg border border-line-300 text-xs text-ink-600 hover:bg-slate-50 font-medium flex items-center space-x-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-lg bg-primary-700 hover:bg-primary-800 text-white text-xs font-semibold shadow-xs"
            >
              Confirm Assessment
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
