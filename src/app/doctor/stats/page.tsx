"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useSession } from "@/features/auth/auth-context";
import { todayKey } from "@/lib/time";
import { 
  BarChart3, 
  Users, 
  Clock, 
  Flame, 
  SlidersHorizontal,
  CheckCircle2,
  RefreshCw
} from "lucide-react";

interface StatsData {
  totalToday: number;
  completedToday: number;
  avgDurationMinutes: number;
  emergencyCount: number;
  overrideCount: number;
}

export default function DoctorStatsPage() {
  const session = useSession();
  const doctorUid = session.status === "ready" ? session.user.uid : null;

  const [stats, setStats] = useState<StatsData>({
    totalToday: 0,
    completedToday: 0,
    avgDurationMinutes: 0,
    emergencyCount: 0,
    overrideCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      if (!doctorUid) return;
      setLoading(true);

      try {
        const today = todayKey();
        const q = query(
          collection(db, "appointments"),
          where("doctorId", "==", doctorUid),
          where("dateKey", "==", today)
        );

        const snap = await getDocs(q);
        let total = 0;
        let completed = 0;
        let emergencies = 0;
        let overrides = 0;
        let totalDurationMs = 0;
        let consultCountWithDuration = 0;

        snap.forEach((d) => {
          const data = d.data();
          total++;
          if (data.emergencyFlag) emergencies++;
          if (data.manualAdjustment) overrides++;

          if (data.status === "COMPLETED") {
            completed++;
            if (data.startTime && data.endTime) {
              const start = data.startTime.toDate ? data.startTime.toDate().getTime() : new Date(data.startTime).getTime();
              const end = data.endTime.toDate ? data.endTime.toDate().getTime() : new Date(data.endTime).getTime();
              if (end > start) {
                totalDurationMs += end - start;
                consultCountWithDuration++;
              }
            }
          }
        });

        const avgDuration =
          consultCountWithDuration > 0
            ? Math.round(totalDurationMs / consultCountWithDuration / 60000)
            : 12; // default avg consult time

        setStats({
          totalToday: total,
          completedToday: completed,
          avgDurationMinutes: avgDuration,
          emergencyCount: emergencies,
          overrideCount: overrides,
        });
      } catch (err) {
        console.error("Failed to load doctor stats:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [doctorUid]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Clinic Performance &amp; Consult Metrics
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Real-time summary of today&apos;s throughput, consultation duration, and clinical priority overrides.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary-600 mb-2" />
          <p className="text-sm">Calculating doctor performance metrics...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase tracking-wider">
                <span>Completed Consults</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-gray-900">{stats.completedToday}</span>
                <span className="text-xs text-gray-500">/ {stats.totalToday} total</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase tracking-wider">
                <span>Avg Consult Time</span>
                <Clock className="w-4 h-4 text-primary-600" />
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-black text-gray-900">{stats.avgDurationMinutes}</span>
                <span className="text-xs text-gray-500">mins / patient</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase tracking-wider">
                <span>Emergency Flags</span>
                <Flame className="w-4 h-4 text-rose-600" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-rose-600">{stats.emergencyCount}</span>
                <span className="text-xs text-rose-600 font-semibold">Triage alerts</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase tracking-wider">
                <span>Manual Overrides</span>
                <SlidersHorizontal className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-amber-700">{stats.overrideCount}</span>
                <span className="text-xs text-amber-600 font-semibold">Audited changes</span>
              </div>
            </div>
          </div>

          {/* Performance Summary Banner */}
          <div className="bg-gradient-to-r from-primary-900 via-primary-800 to-primary-900 rounded-2xl p-6 text-white shadow-sm space-y-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-teal-300" />
              <h3 className="font-bold text-base">Prioritization Engine Observability</h3>
            </div>
            <p className="text-xs text-teal-100 leading-relaxed max-w-3xl">
              Our explainable prioritization model applies automated dynamic aging (+1 point per 10 minutes) to eliminate waiting starvation for low-acuity patients, while instantly escalating emergency presentations. Manual clinical overrides remain logged with mandatory rationale in accordance with Indian healthcare governance.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
