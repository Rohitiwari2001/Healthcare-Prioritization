"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { apiFetch } from "@/lib/api/client-fetch";
import { SymptomWizard } from "@/features/booking/symptom-wizard";
import { SymptomAssessmentDto } from "@/lib/schemas/assessment";
import { todayKey, formatTime } from "@/lib/time";
import { Calendar, Stethoscope, Clock, Check, AlertTriangle, ArrowRight, ArrowLeft } from "lucide-react";

interface Specialization {
  id: string;
  name: string;
}

interface Doctor {
  uid: string;
  name: string;
  specializationId: string;
  specializationName: string;
  qualification: string;
  avgConsultMinutes: number;
}

interface Slot {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
}

export default function PatientBookingPage() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step 1: Specialization & Doctor
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [selectedSpecId, setSelectedSpecId] = useState("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  // Step 2: Date & Slot
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  // Step 3: Assessment
  const [assessment, setAssessment] = useState<SymptomAssessmentDto | null>(null);

  // Step 4: Final Confirmation Result
  const [bookingResult, setBookingResult] = useState<any>(null);

  // Load specializations and next 7 days
  useEffect(() => {
    async function init() {
      try {
        const specSnap = await getDocs(
          query(collection(db, "specializations"), where("active", "==", true))
        );
        const specList = specSnap.docs.map((d) => ({
          id: d.id,
          name: d.data().name as string,
        }));
        setSpecializations(specList);
        if (specList.length > 0) {
          setSelectedSpecId(specList[0].id);
        }

        // Generate next 7 days in clinic time
        const days: string[] = [];
        const base = new Date();
        for (let i = 0; i < 7; i++) {
          const d = new Date(base);
          d.setDate(d.getDate() + i);
          days.push(todayKey(d));
        }
        setDates(days);
        setSelectedDate(days[0]);
      } catch (err) {
        console.error("Initialization error:", err);
      }
    }
    init();
  }, []);

  // Load doctors when specialization changes
  useEffect(() => {
    if (!selectedSpecId) return;
    async function loadDocs() {
      try {
        const q = query(
          collection(db, "doctors"),
          where("specializationId", "==", selectedSpecId),
          where("active", "==", true)
        );
        const snap = await getDocs(q);
        const docs = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as Doctor));
        setDoctors(docs);
        if (docs.length > 0) {
          setSelectedDoctor(docs[0]);
        } else {
          setSelectedDoctor(null);
        }
      } catch (err) {
        console.error("Error loading doctors:", err);
      }
    }
    loadDocs();
  }, [selectedSpecId]);

  // Load slots when doctor or date changes
  useEffect(() => {
    if (!selectedDoctor || !selectedDate) return;
    const docId = selectedDoctor.uid;
    const dateKey = selectedDate;

    async function loadSlots() {
      setSlotsLoading(true);
      try {
        const q = query(
          collection(db, "slots"),
          where("doctorId", "==", docId),
          where("dateKey", "==", dateKey),
          where("status", "==", "AVAILABLE")
        );
        const snap = await getDocs(q);
        const availableSlots = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Slot[];
        availableSlots.sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
        setSlots(availableSlots);
        setSelectedSlot(null);
      } catch (err) {
        console.error("Error loading slots:", err);
      } finally {
        setSlotsLoading(false);
      }
    }
    loadSlots();
  }, [selectedDoctor, selectedDate]);

  const handleAssessmentComplete = async (assessmentData: SymptomAssessmentDto) => {
    setAssessment(assessmentData);
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await apiFetch<any>("/appointments", {
        method: "POST",
        json: {
          doctorId: selectedDoctor!.uid,
          slotId: selectedSlot!.id,
          assessment: assessmentData,
        },
      });

      setBookingResult(res);
      setStep(4);
      setLoading(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to book appointment");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-line-300">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight">
            Book a Clinic Appointment
          </h1>
          <p className="text-xs text-ink-600 mt-0.5">
            Step {step} of 3 &bull; Explainable patient prioritization
          </p>
        </div>

        {step < 4 && (
          <div className="flex space-x-1.5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 w-8 rounded-full ${
                  step >= s ? "bg-primary-700" : "bg-line-300"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Step 1: Select Doctor & Specialty */}
      {step === 1 && (
        <div className="bg-surface border border-line-300 rounded-xl p-6 shadow-xs space-y-5">
          <h2 className="text-sm font-bold text-ink-900 uppercase tracking-wide">
            1. Select Clinical Specialization & Doctor
          </h2>

          <div>
            <label className="block text-xs font-semibold text-ink-900 mb-1">
              Medical Specialty
            </label>
            <select
              value={selectedSpecId}
              onChange={(e) => setSelectedSpecId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-line-300 text-sm text-ink-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-700"
            >
              {specializations.map((spec) => (
                <option key={spec.id} value={spec.id}>
                  {spec.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-900 mb-2">
              Available Doctors ({doctors.length})
            </label>
            {doctors.length === 0 ? (
              <div className="p-6 text-center text-xs text-ink-500 border border-dashed border-line-300 rounded-lg">
                No active doctors registered under this specialization.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {doctors.map((doc) => {
                  const isSelected = selectedDoctor?.uid === doc.uid;
                  return (
                    <div
                      key={doc.uid}
                      onClick={() => setSelectedDoctor(doc)}
                      className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary-700 bg-primary-50 ring-2 ring-primary-700 shadow-xs"
                          : "border-line-300 hover:border-slate-400 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-sm text-ink-900 flex items-center">
                            <Stethoscope className="w-4 h-4 mr-1 text-primary-700" />
                            {doc.name}
                          </h4>
                          <span className="text-xs text-ink-600 block mt-0.5">
                            {doc.qualification}
                          </span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-primary-700" />}
                      </div>
                      <div className="mt-2 text-[11px] text-ink-500">
                        Avg consult: {doc.avgConsultMinutes} mins
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              disabled={!selectedDoctor}
              onClick={() => setStep(2)}
              className="px-6 py-2.5 rounded-lg bg-primary-700 hover:bg-primary-800 text-white text-xs font-semibold disabled:opacity-50 flex items-center space-x-1"
            >
              <span>Next: Choose Date & Slot</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Select Date & Available Slot */}
      {step === 2 && (
        <div className="bg-surface border border-line-300 rounded-xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink-900 uppercase tracking-wide">
              2. Choose Appointment Date & Time
            </h2>
            <button
              onClick={() => setStep(1)}
              className="text-xs text-primary-700 hover:text-primary-800 font-medium flex items-center"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Change Doctor
            </button>
          </div>

          {/* Date Chips */}
          <div>
            <label className="block text-xs font-semibold text-ink-900 mb-2">
              Select Clinic Date
            </label>
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {dates.map((d) => {
                const isSelected = selectedDate === d;
                const [y, m, dayNum] = d.split("-").map(Number);
                const dateObj = new Date(y, m - 1, dayNum);
                const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedDate(d)}
                    className={`flex-shrink-0 px-3.5 py-2 rounded-lg border text-center transition-all ${
                      isSelected
                        ? "bg-primary-700 text-white border-primary-700 font-semibold shadow-xs"
                        : "bg-white border-line-300 text-ink-900 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-[10px] uppercase block opacity-80">{dayName}</span>
                    <span className="text-sm font-bold">{dayNum}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slots Grid */}
          <div>
            <label className="block text-xs font-semibold text-ink-900 mb-2">
              Available Time Slots ({slots.length})
            </label>
            {slotsLoading ? (
              <div className="p-8 text-center text-xs text-ink-500 animate-pulse">
                Loading available slots...
              </div>
            ) : slots.length === 0 ? (
              <div className="p-6 text-center text-xs text-ink-500 border border-dashed border-line-300 rounded-lg">
                No slots currently available for {selectedDoctor?.name} on this date.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {slots.map((s) => {
                  const isSelected = selectedSlot?.id === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSlot(s)}
                      className={`py-2 px-2 rounded-lg border text-xs font-medium text-center transition-all flex items-center justify-center space-x-1 ${
                        isSelected
                          ? "bg-primary-50 text-primary-900 border-primary-700 ring-2 ring-primary-700 font-bold"
                          : "bg-white border-line-300 text-ink-900 hover:bg-slate-50"
                      }`}
                    >
                      <Clock className="w-3 h-3 text-ink-500" />
                      <span>{s.startTime}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-lg border border-line-300 text-xs text-ink-600 hover:bg-slate-50 font-medium"
            >
              Back
            </button>
            <button
              disabled={!selectedSlot}
              onClick={() => setStep(3)}
              className="px-6 py-2.5 rounded-lg bg-primary-700 hover:bg-primary-800 text-white text-xs font-semibold disabled:opacity-50 flex items-center space-x-1"
            >
              <span>Next: Symptom Assessment</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Symptom Intake Wizard */}
      {step === 3 && (
        <SymptomWizard
          onComplete={handleAssessmentComplete}
          onCancel={() => setStep(2)}
        />
      )}

      {/* Step 4: Booking Confirmation Screen (DOC_6 Section 7.3) */}
      {step === 4 && bookingResult && (
        <div className="bg-surface border border-line-300 rounded-xl p-8 shadow-xs space-y-6 text-center">
          <div className="h-14 w-14 rounded-full bg-green-50 text-green-700 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-ink-900 tracking-tight">
              Appointment Successfully Confirmed!
            </h2>
            <p className="text-xs text-ink-600 mt-1">
              Your appointment has been registered in the clinic system.
            </p>
          </div>

          {/* Emergency Alert Banner if red flag detected */}
          {bookingResult.emergencyFlag && (
            <div className="p-4 rounded-xl bg-red-50 border-2 border-red-300 text-red-950 text-left flex items-start space-x-3">
              <AlertTriangle className="w-6 h-6 text-red-700 flex-shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <span className="font-bold text-sm text-red-900 block">
                  Notice: Emergency Priority Flagged
                </span>
                <p>{bookingResult.emergencyAdvisory}</p>
              </div>
            </div>
          )}

          {/* Booking Summary Box */}
          <div className="bg-slate-50 border border-line-300 rounded-xl p-5 text-left text-xs space-y-2 max-w-md mx-auto">
            <div className="flex justify-between py-1 border-b border-line-300">
              <span className="text-ink-500">Doctor:</span>
              <span className="font-semibold text-ink-900">{bookingResult.doctorName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-line-300">
              <span className="text-ink-500">Scheduled Date:</span>
              <span className="font-semibold text-ink-900">{selectedDate}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-ink-500">Slot Time:</span>
              <span className="font-semibold text-ink-900">{selectedSlot?.startTime}</span>
            </div>
          </div>

          <div className="max-w-md mx-auto text-left text-xs text-ink-600 space-y-2">
            <h4 className="font-bold text-ink-900 uppercase tracking-wide">
              What happens next?
            </h4>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-ink-600">
              <li>Please arrive at the clinic 10 minutes prior to your slot time.</li>
              <li>Check in upon arrival (via your portal or the reception desk) to activate your place and fairness aging in the live queue.</li>
              <li>Your queue position updates automatically as doctors attend patients.</li>
            </ul>
          </div>

          <div className="pt-4 flex justify-center space-x-3">
            <Link
              href="/patient"
              className="px-5 py-2.5 rounded-lg bg-primary-700 hover:bg-primary-800 text-white text-xs font-semibold shadow-xs"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
