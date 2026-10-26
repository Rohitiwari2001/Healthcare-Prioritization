"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { 
  BarChart3, 
  Download, 
  Users, 
  Clock, 
  Flame, 
  SlidersHorizontal,
  Calendar,
  CheckCircle2
} from "lucide-react";

interface ReportMetrics {
  totalAppointments: number;
  completedAppointments: number;
  noShowAppointments: number;
  emergencyCount: number;
  overrideCount: number;
  onlineCount: number;
  receptionCount: number;
  walkInCount: number;
}

export default function AdminReportsPage() {
  const [metrics, setMetrics] = useState<ReportMetrics>({
    totalAppointments: 0,
    completedAppointments: 0,
    noShowAppointments: 0,
    emergencyCount: 0,
    overrideCount: 0,
    onlineCount: 0,
    receptionCount: 0,
    walkInCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      setLoading(true);
      try {
        const snap = await getDocs(query(collection(db, "appointments"), limit(500)));
        let total = 0;
        let completed = 0;
        let noShow = 0;
        let emergencies = 0;
        let overrides = 0;
        let online = 0;
        let reception = 0;
        let walkIn = 0;

        snap.forEach((d) => {
          const data = d.data();
          total++;
          if (data.status === "COMPLETED") completed++;
          if (data.status === "NO_SHOW") noShow++;
          if (data.emergencyFlag) emergencies++;
          if (data.manualAdjustment) overrides++;
          if (data.source === "ONLINE") online++;
          else if (data.source === "RECEPTION") reception++;
          else if (data.source === "WALK_IN") walkIn++;
        });

        setMetrics({
          totalAppointments: total,
          completedAppointments: completed,
          noShowAppointments: noShow,
          emergencyCount: emergencies,
          overrideCount: overrides,
          onlineCount: online,
          receptionCount: reception,
          walkInCount: walkIn,
        });
      } catch (err) {
        console.error("Failed to load reports:", err);
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, []);

  const exportSummaryCsv = () => {
    const rows = [
      ["Metric", "Value"],
      ["Total Appointments Recorded", metrics.totalAppointments],
      ["Completed Consultations", metrics.completedAppointments],
      ["No-Show Appointments", metrics.noShowAppointments],
      ["Emergency Presentations", metrics.emergencyCount],
      ["Manual Priority Overrides", metrics.overrideCount],
      ["Source: Online Bookings", metrics.onlineCount],
      ["Source: Reception Bookings", metrics.receptionCount],
      ["Source: Direct Walk-ins", metrics.walkInCount],
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((r) => r.join(",")).join("\n");
    const encoded = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encoded);
    link.setAttribute("download", `hospital_kpi_summary_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary-700" />
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Hospital Analytics &amp; Clinical Reports
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Clinic throughput, emergency volume, priority distributions, and no-show performance.
          </p>
        </div>

        <button
          type="button"
          onClick={exportSummaryCsv}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl bg-white hover:bg-gray-50 text-gray-800 text-xs font-bold shadow-xs transition-colors"
        >
          <Download className="w-4 h-4 text-primary-700" />
          <span>Export Summary CSV</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Total Volume</span>
          <div className="mt-2 text-3xl font-black text-gray-900">{metrics.totalAppointments}</div>
          <span className="text-xs text-gray-400 mt-1 block">Outpatient encounters</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Completed</span>
          <div className="mt-2 text-3xl font-black text-emerald-700">{metrics.completedAppointments}</div>
          <span className="text-xs text-emerald-700 font-semibold mt-1 block">Full consultations</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Emergencies</span>
          <div className="mt-2 text-3xl font-black text-rose-600">{metrics.emergencyCount}</div>
          <span className="text-xs text-rose-600 font-semibold mt-1 block">Red-flag alerts</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Overrides</span>
          <div className="mt-2 text-3xl font-black text-amber-600">{metrics.overrideCount}</div>
          <span className="text-xs text-amber-600 font-semibold mt-1 block">Audited doctor actions</span>
        </div>
      </div>

      {/* Booking Channel Distribution */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-gray-900 text-sm border-b border-gray-100 pb-3">
          Channel &amp; Intake Source Breakdown
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl">
            <span className="text-xs font-bold text-teal-800 uppercase tracking-wider block">Online Patient Portal</span>
            <div className="text-2xl font-black text-teal-950 mt-1">{metrics.onlineCount}</div>
          </div>
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl">
            <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider block">Reception Bookings</span>
            <div className="text-2xl font-black text-indigo-950 mt-1">{metrics.receptionCount}</div>
          </div>
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">Emergency &amp; Walk-ins</span>
            <div className="text-2xl font-black text-amber-950 mt-1">{metrics.walkInCount}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
