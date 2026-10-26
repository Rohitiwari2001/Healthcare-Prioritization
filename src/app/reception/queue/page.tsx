"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useSession } from "@/features/auth/auth-context";
import { useCan } from "@/features/auth/area-gate";
import { useLiveQueue } from "@/features/queue/use-live-queue";
import { useAutoSweep } from "@/features/queue/use-auto-sweep";
import { QueueTable } from "@/features/queue/queue-table";
import { Users, Filter, RefreshCw, AlertCircle } from "lucide-react";

interface DoctorOption {
  uid: string;
  displayName: string;
  specializationName?: string;
}

export default function ReceptionQueueOverviewPage() {
  const session = useSession();
  useAutoSweep();

  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("ALL");

  const canOverride = useCan("priority.override");
  const canViewBreakdown = useCan("queue.view_breakdown");

  useEffect(() => {
    async function loadDoctors() {
      try {
        const snap = await getDocs(query(collection(db, "users"), where("role", "==", "doctor")));
        const list: DoctorOption[] = [];
        snap.forEach((d) => {
          const data = d.data();
          if (data.active !== false) {
            list.push({
              uid: d.id,
              displayName: data.displayName || "Doctor",
            });
          }
        });
        setDoctors(list);
      } catch (err) {
        console.error("Error loading doctors for queue filter:", err);
      }
    }
    loadDoctors();
  }, []);

  const doctorFilter = selectedDoctorId === "ALL" ? null : selectedDoctorId;
  const { queue, loading, error, now, configParams } = useLiveQueue(doctorFilter);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-primary-700" />
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Hospital Queue Overview
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Real-time waiting room monitoring across outpatient consultation rooms.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="pl-8 pr-8 py-2 text-xs font-semibold border border-gray-300 rounded-xl bg-white shadow-xs focus:ring-2 focus:ring-primary-500 text-gray-800"
            >
              <option value="ALL">All Consulting Doctors</option>
              {doctors.map((doc) => (
                <option key={doc.uid} value={doc.uid}>
                  {doc.displayName}
                </option>
              ))}
            </select>
            <Filter className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-gray-400 animate-spin" />
            Live Sync
          </span>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary-600" />
          <p className="font-medium text-sm text-gray-600">Syncing live clinic queue...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-800 space-y-2">
          <AlertCircle className="w-8 h-8 mx-auto text-red-600" />
          <p className="font-semibold text-sm">Error connecting to queue stream</p>
          <p className="text-xs text-red-600">{error}</p>
        </div>
      ) : (
        <QueueTable
          queue={queue}
          config={configParams}
          now={now}
          isDoctorView={false}
          canOverride={canOverride}
          canViewBreakdown={canViewBreakdown}
        />
      )}
    </div>
  );
}
