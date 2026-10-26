"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { apiFetch } from "@/lib/api/client-fetch";
import { SymptomWizard } from "@/features/booking/symptom-wizard";
import { SymptomAssessmentDto } from "@/lib/schemas/assessment";
import { Footprints, Search, UserPlus, Check, AlertTriangle } from "lucide-react";

export default function ReceptionWalkInPage() {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Patient
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newDob, setNewDob] = useState("");
  const [newGender, setNewGender] = useState("MALE");

  // Doctor
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);

  // Result
  const [walkInResult, setWalkInResult] = useState<any>(null);

  useEffect(() => {
    async function loadDocs() {
      const q = query(collection(db, "doctors"), where("active", "==", true));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => d.data());
      setDoctors(list);
      if (list.length > 0) setSelectedDoctor(list[0]);
    }
    loadDocs();
  }, []);

  const handlePatientSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setLoading(true);
    try {
      const clean = searchTerm.trim();
      const phoneQuery = clean.startsWith("+") ? clean : `+91${clean}`;
      let q = query(collection(db, "patients"), where("phone", "==", phoneQuery), where("mergedInto", "==", null));
      let snap = await getDocs(q);
      if (snap.empty) {
        q = query(collection(db, "patients"), where("patientCode", "==", clean.toUpperCase()), where("mergedInto", "==", null));
        snap = await getDocs(q);
      }
      setSearchResults(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
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
        json: { name: newName.trim(), phone: newPhone.trim(), dob: newDob, gender: newGender },
      });
      setSelectedPatient({ id: res.patientId, patientCode: res.patientCode, name: newName, phone: newPhone });
      setShowNewPatientForm(false);
      setStep(1);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create patient profile");
    } finally {
      setLoading(false);
    }
  };

  const handleAssessmentComplete = async (assessment: SymptomAssessmentDto) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch<any>("/walk-ins", {
        method: "POST",
        json: {
          patientId: selectedPatient.id,
          doctorId: selectedDoctor.uid,
          assessment,
        },
      });
      setWalkInResult(res);
      setStep(3);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to register walk-in patient");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-line-300">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight flex items-center">
            <Footprints className="w-6 h-6 mr-2 text-primary-700" />
            Direct Walk-in Queue Registration
          </h1>
          <p className="text-xs text-ink-600 mt-0.5">
            Immediate queue entry without reserved slot. Aging starts right away.
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
        <div className="bg-surface border border-line-300 rounded-xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink-900 uppercase tracking-wide">
              1. Select Walk-in Patient
            </h2>
            <button
              onClick={() => setShowNewPatientForm(!showNewPatientForm)}
              className="text-xs text-primary-700 hover:text-primary-800 font-semibold flex items-center"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1" />
              {showNewPatientForm ? "Lookup Existing" : "Create New Profile"}
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
                    placeholder="Search phone or patient code (P-000001)..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-line-300 text-xs text-ink-900"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-primary-700 hover:bg-primary-800 text-white text-xs font-semibold"
                >
                  Search
                </button>
              </form>

              {searchResults.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-lg border border-line-300 flex items-center justify-between hover:bg-slate-50"
                >
                  <div>
                    <span className="font-bold text-xs text-ink-900 block">{p.name}</span>
                    <span className="text-[11px] text-ink-500">{p.patientCode} &bull; {p.phone}</span>
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
          ) : (
            <form onSubmit={handleCreatePatient} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink-900 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Patient Name"
                  className="w-full px-3 py-2 rounded-lg border border-line-300 text-xs text-ink-900"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full px-3 py-2 rounded-lg border border-line-300 text-xs text-ink-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1">DOB</label>
                  <input
                    type="date"
                    required
                    value={newDob}
                    onChange={(e) => setNewDob(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-line-300 text-xs text-ink-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1">Gender</label>
                  <select
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-line-300 text-xs text-ink-900 bg-white"
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
                Save Patient Profile & Continue
              </button>
            </form>
          )}
        </div>
      )}

      {/* Step 1: Assign Doctor */}
      {step === 1 && (
        <div className="bg-surface border border-line-300 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-line-300">
            <span className="text-xs font-semibold text-ink-900">
              Walk-in Patient: {selectedPatient.name} ({selectedPatient.patientCode})
            </span>
            <button onClick={() => setStep(0)} className="text-xs text-primary-700">Change</button>
          </div>

          <h2 className="text-sm font-bold text-ink-900 uppercase tracking-wide">
            2. Assign Attending Doctor
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {doctors.map((d) => (
              <div
                key={d.uid}
                onClick={() => setSelectedDoctor(d)}
                className={`p-3 rounded-lg border cursor-pointer text-xs ${
                  selectedDoctor?.uid === d.uid ? "border-primary-700 bg-primary-50 ring-2 ring-primary-700" : "border-line-300"
                }`}
              >
                <span className="font-bold text-ink-900 block">{d.name}</span>
                <span className="text-ink-600 block">{d.specializationName}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              disabled={!selectedDoctor}
              onClick={() => setStep(2)}
              className="px-5 py-2 rounded-lg bg-primary-700 hover:bg-primary-800 text-white text-xs font-semibold"
            >
              Next: Symptoms Assessment
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Symptoms */}
      {step === 2 && (
        <SymptomWizard
          onComplete={handleAssessmentComplete}
          onCancel={() => setStep(1)}
        />
      )}

      {/* Step 3: Done */}
      {step === 3 && walkInResult && (
        <div className="bg-surface border border-line-300 rounded-xl p-8 shadow-xs text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-green-50 text-green-700 flex items-center justify-center mx-auto">
            <Check className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-ink-900">Walk-in Patient Added Directly to Live Queue!</h2>
          <p className="text-xs text-ink-600">
            {selectedPatient.name} &bull; Doctor: {selectedDoctor.name} &bull; Status: Waiting (CHECKED_IN)
          </p>

          <div className="p-3 bg-slate-50 border border-line-300 rounded-lg text-xs max-w-sm mx-auto">
            <span className="text-ink-500">Base Priority Score: </span>
            <strong className="text-ink-900">{walkInResult.baseScore}</strong>
          </div>

          <div className="pt-4 flex justify-center space-x-3">
            <Link
              href="/reception/queue"
              className="px-4 py-2 rounded-lg bg-primary-700 hover:bg-primary-800 text-white text-xs font-semibold"
            >
              View Live Queue
            </Link>
            <button
              onClick={() => {
                setStep(0);
                setSelectedPatient(null);
                setWalkInResult(null);
              }}
              className="px-4 py-2 rounded-lg border border-line-300 text-xs text-ink-900"
            >
              Register Another Walk-in
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
