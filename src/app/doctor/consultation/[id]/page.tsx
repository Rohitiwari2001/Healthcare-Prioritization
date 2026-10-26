"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { apiFetch } from "@/lib/api/client";
import { 
  Stethoscope, 
  User, 
  FileText, 
  Pill, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ArrowLeft,
  Flame,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { SourceBadge, StatusBadge } from "@/components/shared/badges";
import { AppointmentStatus } from "@/lib/constants/enums";

interface AppointmentData {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender?: string;
  patientCode?: string;
  status: AppointmentStatus;
  doctorId: string;
  doctorName?: string;
  source: "ONLINE" | "RECEPTION" | "WALK_IN";
  emergencyFlag: boolean;
  baseScore: number;
  startTime?: string | null;
  endTime?: string | null;
}

interface AssessmentData {
  chiefComplaint: string;
  symptoms: string[];
  notes?: string;
  severitySelf: string;
  onset: string;
  durationHours: number;
  selfUrgent: boolean;
}

interface ConsultationData {
  notes: string;
  prescription?: string;
  completedAt?: string;
}

export default function DoctorConsultationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: appointmentId } = use(params);
  const router = useRouter();

  const [appt, setAppt] = useState<AppointmentData | null>(null);
  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const [existingConsultation, setExistingConsultation] = useState<ConsultationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [notes, setNotes] = useState("");
  const [prescription, setPrescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const apptRef = doc(db, "appointments", appointmentId);
        const apptSnap = await getDoc(apptRef);

        if (!apptSnap.exists()) {
          setError("Appointment not found");
          setLoading(false);
          return;
        }

        const data = apptSnap.data();
        setAppt({
          id: apptSnap.id,
          patientId: data.patientId,
          patientName: data.patientName || "Unknown",
          patientAge: data.patientAge ?? 0,
          patientGender: data.patientGender,
          patientCode: data.patientCode,
          status: data.status,
          doctorId: data.doctorId,
          doctorName: data.doctorName,
          source: data.source || "ONLINE",
          emergencyFlag: !!data.emergencyFlag,
          baseScore: data.baseScore ?? 0,
          startTime: data.startTime?.toDate?.()?.toISOString() ?? null,
          endTime: data.endTime?.toDate?.()?.toISOString() ?? null,
        });

        // Assessment subcollection
        const assessRef = doc(db, "appointments", appointmentId, "clinical", "assessment");
        const assessSnap = await getDoc(assessRef);
        if (assessSnap.exists()) {
          setAssessment(assessSnap.data() as AssessmentData);
        }

        // Existing consultation if completed
        if (data.status === "COMPLETED") {
          const consultRef = doc(db, "appointments", appointmentId, "clinical", "consultation");
          const consultSnap = await getDoc(consultRef);
          if (consultSnap.exists()) {
            const cData = consultSnap.data() as ConsultationData;
            setExistingConsultation(cData);
            setNotes(cData.notes || "");
            setPrescription(cData.prescription || "");
          }
        }
      } catch (err: unknown) {
        console.error("Load consultation error:", err);
        const msg = err instanceof Error ? err.message : "Failed to load consultation details";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [appointmentId]);

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      setSubmitError("Doctor consultation notes are mandatory.");
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await apiFetch(`/api/appointments/${appointmentId}/complete`, {
        method: "PUT",
        body: JSON.stringify({
          notes: notes.trim(),
          prescription: prescription.trim() || undefined,
        }),
      });

      setIsSuccess(true);
      setTimeout(() => {
        router.push("/doctor/queue");
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to complete consultation";
      setSubmitError(msg);
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-gray-500">
        <Stethoscope className="w-8 h-8 animate-pulse mx-auto text-primary-600 mb-2" />
        <p className="font-medium">Loading patient clinical chart...</p>
      </div>
    );
  }

  if (error || !appt) {
    return (
      <div className="max-w-4xl mx-auto bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-800">
        <AlertTriangle className="w-8 h-8 mx-auto text-red-600 mb-2" />
        <h3 className="font-bold">{error || "Appointment not found"}</h3>
        <Link
          href="/doctor/queue"
          className="mt-4 inline-flex items-center text-sm font-semibold text-primary-700 hover:text-primary-800"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Return to Queue
        </Link>
      </div>
    );
  }

  const isCompleted = appt.status === "COMPLETED";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/doctor/queue"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Live Queue</span>
        </Link>
        <div className="flex items-center gap-2">
          <StatusBadge status={appt.status} />
          <SourceBadge source={appt.source} />
        </div>
      </div>

      {/* Patient Header Card */}
      <div className={`p-6 rounded-2xl border shadow-sm ${
        appt.emergencyFlag
          ? "bg-rose-50/70 border-rose-300"
          : "bg-white border-gray-200"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary-100 text-primary-800 flex items-center justify-center font-bold text-lg flex-shrink-0">
              <User className="w-6 h-6 text-primary-700" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-gray-900">{appt.patientName}</h1>
                {appt.patientCode && (
                  <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {appt.patientCode}
                  </span>
                )}
                {appt.emergencyFlag && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white animate-pulse">
                    <Flame className="w-3.5 h-3.5" /> Emergency Red Flag
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                Age: <strong className="text-gray-700">{appt.patientAge} years</strong> &bull; Gender: <strong className="text-gray-700">{appt.patientGender || "Not specified"}</strong>
              </p>
            </div>
          </div>

          <div className="text-right sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-200">
            <span className="text-xs text-gray-500 uppercase tracking-wider block">Priority Score</span>
            <span className="text-2xl font-black text-primary-700">{appt.baseScore} pts</span>
          </div>
        </div>
      </div>

      {/* Patient Symptom Intake (Read-only) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2 text-gray-900 font-bold">
            <FileText className="w-5 h-5 text-primary-700" />
            <h3>Patient Intake &amp; Triage Assessment</h3>
          </div>
          <span className="text-xs text-gray-400">Captured at intake</span>
        </div>

        {assessment ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-1">
                Chief Complaint
              </span>
              <p className="font-semibold text-gray-800 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                {assessment.chiefComplaint}
              </p>
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-1">
                Severity &amp; Onset
              </span>
              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 flex items-center justify-between">
                <span>
                  Severity: <strong>{assessment.severitySelf}</strong>
                </span>
                <span>
                  Onset: <strong>{assessment.onset}</strong>
                </span>
                <span>
                  Duration: <strong>{assessment.durationHours}h</strong>
                </span>
              </div>
            </div>

            <div className="md:col-span-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-1">
                Reported Symptoms ({assessment.symptoms.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {assessment.symptoms.map((sym) => (
                  <span
                    key={sym}
                    className="px-2.5 py-1 bg-primary-50 text-primary-800 border border-primary-200 rounded-lg text-xs font-medium"
                  >
                    {sym.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>

            {assessment.notes && (
              <div className="md:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-1">
                  Patient Intake Remarks
                </span>
                <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100 italic">
                  &quot;{assessment.notes}&quot;
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">No detailed clinical intake captured.</p>
        )}
      </div>

      {/* Consultation Section (Editable if in progress, read-only if completed) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2 text-gray-900 font-bold">
            <Stethoscope className="w-5 h-5 text-emerald-700" />
            <h3>Doctor Consultation &amp; Prescription</h3>
          </div>
          {isCompleted && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              <ShieldCheck className="w-4 h-4" /> Consultation Completed
            </span>
          )}
        </div>

        {isSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>Consultation completed successfully! Redirecting back to live queue...</span>
          </div>
        )}

        {submitError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <form onSubmit={handleComplete} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-primary-600" />
              Doctor Clinical Notes &amp; Diagnosis *
            </label>
            <textarea
              required
              disabled={isCompleted || isSubmitting}
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record findings, examination notes, provisional diagnosis, and advice..."
              maxLength={2000}
              className="w-full p-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50"
            />
            <div className="flex justify-between text-[11px] text-gray-400 mt-1">
              <span>Required for completing encounter</span>
              <span>{notes.length}/2000</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Pill className="w-4 h-4 text-emerald-600" />
              Prescription &amp; Orders (Optional)
            </label>
            <textarea
              disabled={isCompleted || isSubmitting}
              rows={4}
              value={prescription}
              onChange={(e) => setPrescription(e.target.value)}
              placeholder="e.g. Tab Paracetamol 500mg TDS x 3 days, Tab Cetirizine 10mg OD HS..."
              maxLength={2000}
              className="w-full p-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-50 font-mono text-xs"
            />
            <div className="flex justify-between text-[11px] text-gray-400 mt-1">
              <span>Patient can review prescribed medication on their portal</span>
              <span>{prescription.length}/2000</span>
            </div>
          </div>

          {!isCompleted && (
            <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
              <Link
                href="/doctor/queue"
                className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Hold / Return to Queue
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || !notes.trim()}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-bold shadow-sm disabled:opacity-50 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? "Finalizing..." : "Complete Consultation"}</span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
