"use client";

import React, { ReactNode } from "react";
import { AreaGate } from "@/features/auth/area-gate";
import { AppShell, NavItemConfig } from "@/components/shared/app-shell";
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Building,
  Clock,
  BarChart3,
  Sliders,
  ShieldAlert,
  FlaskConical,
} from "lucide-react";

const ADMIN_NAV: NavItemConfig[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Users & Access", href: "/admin/users", icon: Users, anyOf: ["users.manage", "permissions.manage"] },
  { label: "Doctors", href: "/admin/doctors", icon: Stethoscope, anyOf: ["doctors.manage"] },
  { label: "Specializations", href: "/admin/specializations", icon: Building, anyOf: ["specializations.manage"] },
  { label: "Slots", href: "/admin/slots", icon: Clock, anyOf: ["slots.manage"] },
  { label: "Live Queue", href: "/admin/queue", icon: Users, anyOf: ["queue.view_all"] },
  { label: "Reports", href: "/admin/reports", icon: BarChart3, anyOf: ["reports.view"] },
  { label: "Scoring Config", href: "/admin/config", icon: Sliders, anyOf: ["config.edit"] },
  { label: "Audit Log", href: "/admin/audit", icon: ShieldAlert, anyOf: ["audit.view"] },
  { label: "Simulation", href: "/admin/simulation", icon: FlaskConical, anyOf: ["simulation.run"] },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AreaGate role="admin">
      <AppShell navItems={ADMIN_NAV}>{children}</AppShell>
    </AreaGate>
  );
}
