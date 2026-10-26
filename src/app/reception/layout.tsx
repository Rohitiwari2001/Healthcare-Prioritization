"use client";

import React, { ReactNode } from "react";
import { AreaGate } from "@/features/auth/area-gate";
import { AppShell, NavItemConfig } from "@/components/shared/app-shell";
import {
  ClipboardList,
  UserCheck,
  Calendar,
  Footprints,
  Users,
  BarChart3,
  Clock,
} from "lucide-react";

const RECEPTION_NAV: NavItemConfig[] = [
  { label: "Desk Home", href: "/reception", icon: ClipboardList, anyOf: ["appointments.checkin_for_patient"] },
  { label: "Patients", href: "/reception/patients", icon: UserCheck, anyOf: ["patients.search"] },
  { label: "Book for Patient", href: "/reception/book", icon: Calendar, anyOf: ["appointments.book_for_patient"] },
  { label: "Register Walk-in", href: "/reception/walk-in", icon: Footprints, anyOf: ["appointments.register_walkin"] },
  { label: "Queue Overview", href: "/reception/queue", icon: Users, anyOf: ["queue.view_all"] },
  { label: "Reports", href: "/reception/reports", icon: BarChart3, anyOf: ["reports.view"] },
  { label: "Slots", href: "/reception/slots", icon: Clock, anyOf: ["slots.manage"] },
];

export default function ReceptionLayout({ children }: { children: ReactNode }) {
  return (
    <AreaGate role="receptionist">
      <AppShell navItems={RECEPTION_NAV}>{children}</AppShell>
    </AreaGate>
  );
}
