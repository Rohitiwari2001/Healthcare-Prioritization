"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { apiFetch } from "@/lib/api/client-fetch";
import { SymptomWizard } from "@/features/booking/symptom-wizard";
import { SymptomAssessmentDto } from "@/lib/schemas/assessment";
import { todayKey } from "@/lib/time";
import {
  Calendar,
  Search,
  UserPlus,
  Stethoscope,
  Clock,
  Check,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

export default function ReceptionBookPage() {
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step 0: Patient Selection
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newDob, setNewDob] = useState("");
  const [newGender, setNewGender] = useState("MALE");

  // Step 1 & 2: Doctor & Slots
  const [specializations, setSpecializations] = useState<any[]>([]);
  const [selectedSpecId, setSelectedSpecId] = useState("");
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);

  // Step 4: Result
  const [bookingResult, setBookingResult] = useState<any>(null);

  useEffect(() => {
    async function init() {
      try {
        const specSnap = await getDocs(
          query(collection(db, "specializations"), where("active", "==", true))
        );
        const list = specSnap.docs.map((d) => ({ id: d.id, name: d.data().name }));
        setSpecializations(list);
        if (list.length > 0) setSelectedSpecId(list[0].id);

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
        console.error(err);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!selectedSpecId) return;
    async function loadDocs() {
      const q = query(
        collection(db, "doctors"),
        where("specializationId", "==", selectedSpecId),
        where("active", "==", true)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
      setDoctors(list);
      setSelectedDoctor(list.length > 0 ? list[0] : null);
    }
    loadDocs();
  }, [selectedSpecId]);

  useEffect(() => {
    if (!selectedDoctor || !selectedDate) return;
    async function loadSlots() {
      try {
        const q = query(
          collection(db, "slots"),
          where("doctorId", "==", selectedDoctor.uid),
          where("dateKey", "==", selectedDate),
          where("status", "==", "AVAILABLE")
        );
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a: any, b: any) => (a.startTime || "").localeCompare(b.startTime || ""));
        setSlots(list);
        setSelectedSlot(null);
      } catch (err) {
        console.error("Error loading slots:", err);
      }
    }
    loadSlots();
  }, [selectedDoctor, selectedDate]);

  const handlePatientSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    try {
      const clean = searchTerm.trim();
      const phoneQuery = clean.startsWith("+") ? clean : `+91${clean}`;

      // Query by phone
      let q = query(
        collection(db, "patients"),
        where("phone", "==", phoneQuery),
        where("mergedInto", "==", null)
      );
      let snap = await getDocs(q);

      if (snap.empty) {
        // Query by patient code
        q = query(
          collection(db, "patients"),
          where("patientCode", "==", clean.toUpperCase()),
          where("mergedInto", "==", null)
        );
        snap = await getDocs(q);
      }

      const results = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSearchResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await apiFetch<{ patientId: string; patientCode: string }>("/patients", {
        method: "POST",
        json: {
          name: newName.trim(),
          phone: newPhone.trim(),
          dob: newDob,
          gender: newGender,
        },
      });

      setSelectedPatient({
        id: res.patientId,
        patientCode: res.patientCode,
        name: newName,
        phone: newPhone,
      });
      setShowNewPatientForm(false);
      setStep(1);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create patient record");
    } finally {
      setLoading(false);
    }
  };

  const handleAssessmentComplete = async (assessment: SymptomAssessmentDto) => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await apiFetch<any>("/appointments", {
        method: "POST",
        json: {
          patientId: selectedPatient.id,
          doctorId: selectedDoctor.uid,
          slotId: selectedSlot.id,
          assessment,
        },
      });

      setBookingResult(res);
      setStep(4);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to book appointment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-line-300">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight">
            Reception Desk: Book for Patient
          </h1>
          <p className="text-xs text-ink-600 mt-0.5">
            Offline booking on behalf of walk-in patient or telephone caller.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Step 0: Find or Create Patient */}
      {step === 0 && (
        <div className="bg-surface border border-line-300 rounded-xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink-900 uppercase tracking-wide">
              Step 1: Identify Patient Record
            </h2>
            <button
              onClick={() => setShowNewPatientForm(!showNewPatientForm)}
              className="text-xs text-primary-700 hover:text-primary-800 font-semibold flex items-center"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1" />
              {showNewPatientForm ? "Search Existing" : "Create New Profile"}
            </button>
          </div>

          {!showNewPatientForm ? (
            <div className="space-y-4">
              <form onSubmit={handlePatientSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-ink-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by 10-digit mobile number or Patient Code (P-000001)..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-line-300 text-xs text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2.5 rounded-lg bg-primary-700 hover:bg-primary-800 text-white text-xs font-semibold"
                >
                  {loading ? "Searching..." : "Lookup"}
                </button>
              </form>

              {searchResults.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-semibold text-ink-600">Matching Records:</span>
                  {searchResults.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-lg border border-line-300 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div>
                        <span className="font-bold text-xs text-ink-900 block">{p.name}</span>
                        <span className="text-[11px] text-ink-500">
                          Code: {p.patientCode} &bull; Phone: {p.phone} &bull; DOB: {p.dob}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedPatient(p);
                          setStep(1);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-primary-700 hover:bg-primary-800 text-white text-xs font-semibold"
                      >
                        Select
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleCreatePatient} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-ink-900 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ramesh Kumar"
                  className="w-full px-3 py-2 rounded-lg border border-line-300 text-xs text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full px-3 py-2 rounded-lg border border-line-300 text-xs text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={newDob}
                    onChange={(e) => setNewDob(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-line-300 text-xs text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-line-300 text-xs text-ink-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-700"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-primary-700 hover:bg-primary-800 text-white text-xs font-semibold"
              >
                {loading ? "Creating..." : "Save Profile & Continue"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Step 1: Doctor */}
      {step === 1 && (
        <div className="bg-surface border border-line-300 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-line-300">
            <div>
              <span className="text-xs text-ink-500">Booking for:</span>
              <span className="font-bold text-xs text-ink-900 ml-1">
                {selectedPatient.name} ({selectedPatient.patientCode})
              </span>
            </div>
            <button
              onClick={() => setStep(0)}
              className="text-xs text-primary-700 hover:text-primary-800"
            >
              Change Patient
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-900 mb-1">Specialization</label>
            <select
              value={selectedSpecId}
              onChange={(e) => setSelectedSpecId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-line-300 text-xs text-ink-900 bg-white"
            >
              {specializations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {doctors.map((d) => {
              const isSelected = selectedDoctor?.uid === d.uid;
              return (
                <div
                  key={d.uid}
                  onClick={() => setSelectedDoctor(d)}
                  className={`p-3 rounded-lg border cursor-pointer text-xs ${
                    isSelected ? "border-primary-700 bg-primary-50 ring-2 ring-primary-700" : "border-line-300"
                  }`}
                >
                  <span className="font-bold text-ink-900 block">{d.name}</span>
                  <span className="text-ink-600 block">{d.qualification}</span>
                </div>
              );
            })}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              disabled={!selectedDoctor}
              onClick={() => setStep(2)}
              className="px-5 py-2 rounded-lg bg-primary-700 hover:bg-primary-800 text-white text-xs font-semibold"
            >
              Next: Select Slot
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Date & Slot */}
      {step === 2 && (
        <div className="bg-surface border border-line-300 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {dates.map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDate(d)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${
                  selectedDate === d ? "bg-primary-700 text-white font-bold" : "border-line-300"
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {slots.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSlot(s)}
                className={`py-2 px-2 rounded-lg border text-xs ${
                  selectedSlot?.id === s.id
                    ? "bg-primary-50 border-primary-700 text-primary-900 font-bold ring-2 ring-primary-700"
                    : "border-line-300 text-ink-900 hover:bg-slate-50"
                }`}
              >
                {s.startTime}
              </button>
            ))}
          </div>

          <div className="pt-2 flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-lg border border-line-300 text-xs"
            >
              Back
            </button>
            <button
              disabled={!selectedSlot}
              onClick={() => setStep(3)}
              className="px-5 py-2 rounded-lg bg-primary-700 hover:bg-primary-800 text-white text-xs font-semibold"
            >
              Next: Symptoms
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Symptoms */}
      {step === 3 && (
        <SymptomWizard
          onComplete={handleAssessmentComplete}
          onCancel={() => setStep(2)}
        />
      )}

      {/* Step 4: Done */}
      {step === 4 && bookingResult && (
        <div className="bg-surface border border-line-300 rounded-xl p-8 shadow-xs text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-green-50 text-green-700 flex items-center justify-center mx-auto">
            <Check className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-ink-900">Appointment Booked for Patient</h2>
          <p className="text-xs text-ink-600">
            {selectedPatient.name} &bull; Doctor: {bookingResult.doctorName} &bull; Slot: {selectedSlot?.startTime}
          </p>

          {bookingResult.baseScore !== undefined && (
            <div className="p-3 bg-slate-50 border border-line-300 rounded-lg text-xs max-w-sm mx-auto">
              <span className="text-ink-500">Stored Base Priority Score: </span>
              <strong className="text-ink-900">{bookingResult.baseScore}</strong>
            </div>
          )}

          <div className="pt-4 flex justify-center space-x-3">
            <button
              onClick={() => {
                setStep(0);
                setSelectedPatient(null);
                setBookingResult(null);
              }}
              className="px-4 py-2 rounded-lg bg-primary-700 hover:bg-primary-800 text-white text-xs font-semibold"
            >
              Book Another Patient
            </button>
            <Link
              href="/reception"
              className="px-4 py-2 rounded-lg border border-line-300 text-xs text-ink-900"
            >
              Return to Desk
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
