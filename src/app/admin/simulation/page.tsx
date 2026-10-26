"use client";

import { useState } from "react";
import { 
  SimulationParams, 
  SimulationResult, 
  runSimulation 
} from "@/features/simulation/simulator";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { 
  Play, 
  Download, 
  Cpu, 
  BarChart3, 
  CheckCircle2, 
  AlertTriangle, 
  Flame, 
  ShieldCheck,
  Sparkles
} from "lucide-react";

export default function AdminQueueSimulationPage() {
  const [params, setParams] = useState<SimulationParams>({
    totalPatients: 100,
    doctorCount: 2,
    avgConsultMinutes: 12,
    shiftHours: 8,
    agingDivisor: 10,
    agingCap: 30,
  });

  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleRun = () => {
    setIsSimulating(true);
    // Allow React state render before heavy loop
    setTimeout(() => {
      try {
        const res = runSimulation(params);
        setResult(res);
      } finally {
        setIsSimulating(false);
      }
    }, 50);
  };

  const handleExportCsv = () => {
    if (!result) return;
    const headers = [
      "Patient ID",
      "Arrival Time (min)",
      "Severity",
      "Age",
      "Base Score",
      "FCFS Wait (min)",
      "Static Priority Wait (min)",
      "Dynamic Aging Wait (min)",
    ];
    const rows = result.patients.map((p) => [
      p.id,
      p.arrivalTime,
      p.severity,
      p.age,
      p.baseScore,
      p.fcfsWait,
      p.staticWait,
      p.dynamicWait,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encoded = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encoded);
    link.setAttribute("download", `queue_simulation_${params.totalPatients}pts.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const chartData = result
    ? [
        {
          name: "Critical / Red-Flag",
          FCFS: result.fcfs.criticalAvgWait,
          "Static Priority": result.staticPriority.criticalAvgWait,
          "Dynamic Aging": result.dynamicAging.criticalAvgWait,
        },
        {
          name: "Severe",
          FCFS: result.fcfs.severeAvgWait,
          "Static Priority": result.staticPriority.severeAvgWait,
          "Dynamic Aging": result.dynamicAging.severeAvgWait,
        },
        {
          name: "Moderate",
          FCFS: result.fcfs.moderateAvgWait,
          "Static Priority": result.staticPriority.moderateAvgWait,
          "Dynamic Aging": result.dynamicAging.moderateAvgWait,
        },
        {
          name: "Mild",
          FCFS: result.fcfs.mildAvgWait,
          "Static Priority": result.staticPriority.mildAvgWait,
          "Dynamic Aging": result.dynamicAging.mildAvgWait,
        },
      ]
    : [];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-6 h-6 text-primary-700" />
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Queue Discrete-Event Simulator
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Compare First-Come-First-Served (FCFS), Static Priority, and Dynamic Aging under controlled stochastic arrivals.
          </p>
        </div>

        {result && (
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl bg-white hover:bg-gray-50 text-gray-800 text-xs font-bold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-primary-700" />
            <span>Export Simulation CSV</span>
          </button>
        )}
      </div>

      {/* Simulator Parameters Control Panel */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-gray-900 text-sm border-b border-gray-100 pb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary-700" />
          Simulation Parameters
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Total Arrivals</label>
            <input
              type="number"
              min="20"
              max="1000"
              value={params.totalPatients}
              onChange={(e) => setParams({ ...params, totalPatients: Number(e.target.value) })}
              className="w-full p-2 text-xs border rounded-xl font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Doctor Rooms</label>
            <input
              type="number"
              min="1"
              max="10"
              value={params.doctorCount}
              onChange={(e) => setParams({ ...params, doctorCount: Number(e.target.value) })}
              className="w-full p-2 text-xs border rounded-xl font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Avg Consult (min)</label>
            <input
              type="number"
              min="3"
              max="45"
              value={params.avgConsultMinutes}
              onChange={(e) => setParams({ ...params, avgConsultMinutes: Number(e.target.value) })}
              className="w-full p-2 text-xs border rounded-xl font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Shift Duration (hrs)</label>
            <input
              type="number"
              min="4"
              max="16"
              value={params.shiftHours}
              onChange={(e) => setParams({ ...params, shiftHours: Number(e.target.value) })}
              className="w-full p-2 text-xs border rounded-xl font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Aging Divisor</label>
            <input
              type="number"
              min="1"
              max="60"
              value={params.agingDivisor}
              onChange={(e) => setParams({ ...params, agingDivisor: Number(e.target.value) })}
              className="w-full p-2 text-xs border rounded-xl font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Aging Cap (Pts)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={params.agingCap}
              onChange={(e) => setParams({ ...params, agingCap: Number(e.target.value) })}
              className="w-full p-2 text-xs border rounded-xl font-mono"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            disabled={isSimulating}
            onClick={handleRun}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-700 hover:bg-primary-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{isSimulating ? "Simulating..." : "Run Comparative Simulation"}</span>
          </button>
        </div>
      </div>

      {/* Results Display */}
      {result && (
        <div className="space-y-6">
          {/* Key Findings Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Policy 1: FCFS */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <span className="font-bold text-gray-900 text-sm">1. First-Come First-Served</span>
                <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">Baseline</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Overall Avg Wait:</span>
                  <strong className="text-gray-900">{result.fcfs.avgWait} mins</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-rose-600 font-semibold">Critical Patient Wait:</span>
                  <strong className="text-rose-700">{result.fcfs.criticalAvgWait} mins</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Mild Patient Wait:</span>
                  <strong className="text-gray-900">{result.fcfs.mildAvgWait} mins</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Worst-Case Wait:</span>
                  <strong className="text-gray-900">{result.fcfs.maxWait} mins</strong>
                </div>
              </div>
            </div>

            {/* Policy 2: Static Priority */}
            <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm space-y-3 bg-amber-50/20">
              <div className="flex items-center justify-between pb-2 border-b border-amber-100">
                <span className="font-bold text-amber-950 text-sm">2. Static Priority Only</span>
                <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-mono">No Aging</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Overall Avg Wait:</span>
                  <strong className="text-gray-900">{result.staticPriority.avgWait} mins</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-700 font-semibold">Critical Patient Wait:</span>
                  <strong className="text-emerald-800">{result.staticPriority.criticalAvgWait} mins</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-800 font-semibold">Mild Patient Wait:</span>
                  <strong className="text-amber-900">{result.staticPriority.mildAvgWait} mins</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-rose-600 font-bold">Starvation (&gt;60m wait):</span>
                  <strong className="text-rose-700 font-bold">{result.staticPriority.starvationRate}% of mild</strong>
                </div>
              </div>
            </div>

            {/* Policy 3: Proposed Dynamic Aging */}
            <div className="bg-white rounded-2xl border-2 border-emerald-500/40 p-5 shadow-sm space-y-3 bg-emerald-50/20">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                <span className="font-bold text-emerald-950 text-sm">3. Dynamic Priority + Aging</span>
                <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-bold font-mono">Proposed</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Overall Avg Wait:</span>
                  <strong className="text-gray-900">{result.dynamicAging.avgWait} mins</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-700 font-bold">Critical Patient Wait:</span>
                  <strong className="text-emerald-800 font-black">{result.dynamicAging.criticalAvgWait} mins</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-700 font-semibold">Mild Patient Wait:</span>
                  <strong className="text-emerald-900">{result.dynamicAging.mildAvgWait} mins</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-700 font-bold">Starvation (&gt;60m wait):</span>
                  <strong className="text-emerald-800 font-black">{result.dynamicAging.starvationRate}% of mild</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Graphical Comparison Bar Chart */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary-700" />
                <h3 className="font-bold text-gray-900 text-sm">
                  Average Waiting Time by Acuity (Minutes)
                </h3>
              </div>
              <span className="text-xs text-gray-400">Lower is better</span>
            </div>

            <div className="h-80 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#475569" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#475569" }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                  <Bar dataKey="FCFS" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Static Priority" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Dynamic Aging" fill="#0f766e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
