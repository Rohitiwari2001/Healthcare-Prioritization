"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { formatTime } from "@/lib/time";
import { 
  ShieldAlert, 
  Search, 
  Download, 
  RefreshCw, 
  Filter, 
  FileText,
  SlidersHorizontal,
  UserCheck,
  Lock,
  Calendar
} from "lucide-react";

interface AuditEntry {
  id: string;
  timestamp: string;
  actorUid: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  appointmentId?: string | null;
  reason?: string | null;
  oldValue?: any;
  newValue?: any;
}

export default function AdminAuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const loadAuditLog = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "auditLog"), orderBy("timestamp", "desc"), limit(150));
      const snap = await getDocs(q);
      const list: AuditEntry[] = [];

      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          timestamp: data.timestamp?.toDate?.()?.toLocaleString() ?? "Recently",
          actorUid: data.actorUid || "System",
          actorRole: data.actorRole || "system",
          action: data.action || "UNKNOWN",
          targetType: data.targetType || "RECORD",
          targetId: data.targetId || "",
          appointmentId: data.appointmentId || null,
          reason: data.reason || null,
          oldValue: data.oldValue || null,
          newValue: data.newValue || null,
        });
      });

      setEntries(list);
    } catch (err) {
      console.error("Error loading audit log:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLog();
  }, []);

  const filteredEntries = entries.filter((e) => {
    if (actionFilter !== "ALL" && e.action !== actionFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        e.actorUid.toLowerCase().includes(q) ||
        e.targetId.toLowerCase().includes(q) ||
        (e.reason && e.reason.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const exportToCsv = () => {
    const headers = ["Timestamp", "Actor UID", "Role", "Action", "Target Type", "Target ID", "Reason"];
    const rows = filteredEntries.map((e) => [
      `"${e.timestamp}"`,
      `"${e.actorUid}"`,
      `"${e.actorRole}"`,
      `"${e.action}"`,
      `"${e.targetType}"`,
      `"${e.targetId}"`,
      `"${(e.reason || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `audit_trail_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-primary-700" />
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Hospital System Audit Trail
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Immutable, append-only security and clinical log for priority overrides, user changes, and configs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadAuditLog}
            className="p-2 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50"
            title="Refresh log"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={exportToCsv}
            disabled={filteredEntries.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl bg-white hover:bg-gray-50 text-gray-800 text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-primary-700" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Actor UID, Target ID, or Reason..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>

        <div className="relative">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="pl-8 pr-8 py-2 text-xs font-semibold border border-gray-200 rounded-xl bg-white text-gray-700 outline-none"
          >
            <option value="ALL">All Audit Actions</option>
            <option value="PRIORITY_OVERRIDE">PRIORITY_OVERRIDE</option>
            <option value="CONFIG_UPDATED">CONFIG_UPDATED</option>
            <option value="USER_CREATED">USER_CREATED</option>
            <option value="ACCESS_CHANGED">ACCESS_CHANGED</option>
            <option value="PASSWORD_RESET">PASSWORD_RESET</option>
            <option value="PATIENT_CREATED">PATIENT_CREATED</option>
            <option value="PATIENT_LINKED">PATIENT_LINKED</option>
            <option value="APPOINTMENT_CANCELLED">APPOINTMENT_CANCELLED</option>
          </select>
          <Filter className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-gray-400 space-y-2">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary-600" />
            <p className="text-sm">Loading security audit records...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="py-12 text-center text-gray-400 space-y-2">
            <ShieldAlert className="w-8 h-8 mx-auto text-gray-300" />
            <p className="font-semibold text-gray-700">No audit events match current criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target</th>
                  <th className="py-3 px-4">Audit Details &amp; Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">
                      {entry.timestamp}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900 truncate max-w-[140px]" title={entry.actorUid}>
                        {entry.actorUid}
                      </div>
                      <span className="text-[10px] text-gray-400 uppercase font-sans">
                        {entry.actorRole}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-sans">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        entry.action === "PRIORITY_OVERRIDE"
                          ? "bg-amber-100 text-amber-900"
                          : entry.action === "CONFIG_UPDATED"
                          ? "bg-purple-100 text-purple-900"
                          : entry.action.startsWith("USER") || entry.action.startsWith("ACCESS")
                          ? "bg-blue-100 text-blue-900"
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-sans text-gray-700">
                      <span className="text-[10px] text-gray-400 uppercase block font-mono">
                        {entry.targetType}
                      </span>
                      <span className="font-mono text-xs truncate max-w-[120px] block" title={entry.targetId}>
                        {entry.targetId}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-sans text-gray-700">
                      {entry.reason ? (
                        <p className="italic text-gray-800 bg-gray-50 p-1.5 rounded border border-gray-100">
                          &quot;{entry.reason}&quot;
                        </p>
                      ) : entry.newValue ? (
                        <span className="text-[11px] text-gray-500 font-mono">
                          {JSON.stringify(entry.newValue)}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-[11px]">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
