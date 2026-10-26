"use client";

import React, { ReactNode } from "react";
import { AreaGate } from "@/features/auth/area-gate";
import { AppShell, NavItemConfig } from "@/components/shared/app-shell";
import { LayoutDashboard, Users, Calendar, BarChart3, Clock } from "lucide-react";

const DOCTOR_NAV: NavItemConfig[] = [
  { label: "Overview", href: "/doctor", icon: LayoutDashboard },
  { label: "Live Queue", href: "/doctor/queue", icon: Users, anyOf: ["queue.view_own"] },
  { label: "Appointments", href: "/doctor/appointments", icon: Calendar, anyOf: ["queue.view_own"] },
  { label: "My Slots", href: "/doctor/slots", icon: Clock, anyOf: ["slots.manage_own"] },
  { label: "Statistics", href: "/doctor/stats", icon: BarChart3, anyOf: ["reports.view_own"] },
];

export default function DoctorLayout({ children }: { children: ReactNode }) {
  return (
    <AreaGate role="doctor">
      <AppShell navItems={DOCTOR_NAV}>{children}</AppShell>
    </AreaGate>
  );
}
