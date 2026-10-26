import React from "react";
import {
  CalendarCheck,
  Clock,
  Stethoscope,
  CheckCircle2,
  XCircle,
  UserX,
  AlertTriangle,
  AlertCircle,
  Siren,
  Globe,
  Building,
  Footprints,
  Flag,
} from "lucide-react";
import {
  AppointmentStatus,
  Severity,
  AppointmentType,
} from "@/lib/constants/enums";

export function StatusBadge({ status }: { status: AppointmentStatus | string }) {
  switch (status) {
    case "BOOKED":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <CalendarCheck className="w-3.5 h-3.5 mr-1" />
          Booked
        </span>
      );
    case "CHECKED_IN":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-900">
          <Clock className="w-3.5 h-3.5 mr-1" />
          Waiting
        </span>
      );
    case "IN_PROGRESS":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-900">
          <Stethoscope className="w-3.5 h-3.5 mr-1" />
          In Consultation
        </span>
      );
    case "COMPLETED":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
          Completed
        </span>
      );
    case "CANCELLED":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-800">
          <XCircle className="w-3.5 h-3.5 mr-1" />
          Cancelled
        </span>
      );
    case "NO_SHOW":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-900">
          <UserX className="w-3.5 h-3.5 mr-1" />
          No-show
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
          {status}
        </span>
      );
  }
}

export function PriorityBadge({
  severity,
  score,
}: {
  severity: Severity;
  score?: number;
}) {
  switch (severity) {
    case "CRITICAL":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
          <Siren className="w-3.5 h-3.5 mr-1 text-red-700 animate-pulse" />
          Critical {score !== undefined && `(${score})`}
        </span>
      );
    case "SEVERE":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-900">
          <AlertTriangle className="w-3.5 h-3.5 mr-1 text-orange-700" />
          Severe {score !== undefined && `(${score})`}
        </span>
      );
    case "MODERATE":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-900">
          <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-700" />
          Moderate {score !== undefined && `(${score})`}
        </span>
      );
    case "MILD":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-700" />
          Mild {score !== undefined && `(${score})`}
        </span>
      );
  }
}

export function SourceBadge({
  type,
  source,
}: {
  type?: AppointmentType | string;
  source?: AppointmentType | string;
}) {
  const actualType = (source || type || "ONLINE") as AppointmentType;
  switch (actualType) {
    case "ONLINE":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          <Globe className="w-3 h-3 mr-1 text-slate-500" />
          Online
        </span>
      );
    case "RECEPTION":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          <Building className="w-3 h-3 mr-1 text-slate-500" />
          Reception
        </span>
      );
    case "WALK_IN":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          <Footprints className="w-3 h-3 mr-1 text-slate-500" />
          Walk-in
        </span>
      );
  }
}

export function EmergencyFlagBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-300">
      <Flag className="w-3 h-3 mr-1 fill-red-600 text-red-600" />
      EMERGENCY FLAGGED
    </span>
  );
}
