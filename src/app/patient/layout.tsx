"use client";

import React, { ReactNode } from "react";
import { AreaGate } from "@/features/auth/area-gate";
import { AppShell, NavItemConfig } from "@/components/shared/app-shell";
import { Home, Calendar, Clock, User } from "lucide-react";

const PATIENT_NAV: NavItemConfig[] = [
  { label: "Home", href: "/patient", icon: Home },
  { label: "Book Appointment", href: "/patient/book", icon: Calendar, anyOf: ["appointments.book_self"] },
  { label: "My Appointments", href: "/patient/appointments", icon: Clock },
  { label: "Profile", href: "/patient/profile", icon: User },
];

export default function PatientLayout({ children }: { children: ReactNode }) {
  return (
    <AreaGate role="patient">
      <AppShell navItems={PATIENT_NAV}>{children}</AppShell>
    </AreaGate>
  );
}
