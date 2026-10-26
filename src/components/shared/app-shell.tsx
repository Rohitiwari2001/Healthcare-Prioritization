"use client";

import React, { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/features/auth/auth-context";
import { useCan } from "@/features/auth/area-gate";
import { useT } from "@/lib/i18n";
import { PermissionKey } from "@/lib/constants/permissions";
import {
  LogOut,
  Calendar,
  Users,
  Settings,
  ClipboardList,
  Activity,
  FileText,
  UserCheck,
  Stethoscope,
  ShieldCheck,
} from "lucide-react";

export interface NavItemConfig {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  anyOf?: PermissionKey[];
}

export function AppShell({
  navItems,
  children,
}: {
  navItems: NavItemConfig[];
  children: ReactNode;
}) {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { t, locale, setLocale } = useT();

  const handleSignOut = async () => {
    await session.signOut();
    router.replace("/login");
  };

  const roleLabels: Record<string, string> = {
    patient: "Patient",
    doctor: "Doctor",
    receptionist: "Receptionist",
    admin: "Administrator",
  };

  const userRole = session.status === "ready" ? session.role : "";
  const userName =
    session.status === "ready"
      ? session.user.displayName || session.user.email
      : "";

  return (
    <div className="min-h-screen flex flex-col bg-pageBg">
      {/* Top Header */}
      <header className="border-b border-line-300 bg-surface px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-primary-700 flex items-center justify-center text-white font-bold text-lg">
              +
            </div>
            <span className="font-semibold text-lg text-ink-900 tracking-tight hidden sm:inline">
              {t("common.appName")}
            </span>
          </Link>

          {userRole && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-primary-800 border border-primary-100">
              {roleLabels[userRole] || userRole}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {/* Language Switch */}
          <div className="text-xs font-medium border border-line-300 rounded-md p-0.5 bg-surface flex">
            <button
              onClick={() => setLocale("en")}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                locale === "en"
                  ? "bg-primary-700 text-white font-semibold"
                  : "text-ink-600 hover:text-ink-900"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLocale("hi")}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                locale === "hi"
                  ? "bg-primary-700 text-white font-semibold"
                  : "text-ink-600 hover:text-ink-900"
              }`}
            >
              हिं
            </button>
          </div>

          {/* User info */}
          <span className="text-xs text-ink-600 hidden md:inline truncate max-w-[150px]">
            {userName}
          </span>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="flex items-center space-x-1 text-xs text-ink-600 hover:text-red-700 transition-colors p-1 rounded"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Left Sidebar */}
        <aside className="w-56 border-r border-line-300 bg-surface p-4 hidden md:block flex-shrink-0">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <SidebarLink key={item.href} item={item} currentPath={pathname} />
            ))}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>

      {/* Mobile Bottom Navigation for Patient */}
      {userRole === "patient" && (
        <nav className="md:hidden border-t border-line-300 bg-surface fixed bottom-0 left-0 right-0 flex justify-around py-2 z-30">
          {navItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center text-[10px] ${
                  isActive ? "text-primary-700 font-semibold" : "text-ink-600"
                }`}
              >
                <Icon className="w-5 h-5 mb-0.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}

      {/* Footer Disclaimer */}
      <footer className="border-t border-line-300 bg-surface px-6 py-3 text-center">
        <p className="text-[11px] text-ink-500 max-w-xl mx-auto">
          {t("common.disclaimer")}
        </p>
      </footer>
    </div>
  );
}

function SidebarLink({
  item,
  currentPath,
}: {
  item: NavItemConfig;
  currentPath: string;
}) {
  const allowed = item.anyOf ? useCan(...item.anyOf) : true;
  if (!allowed) return null;

  const Icon = item.icon;
  const isActive = currentPath === item.href;

  return (
    <Link
      href={item.href}
      className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? "bg-primary-50 text-primary-800 font-semibold"
          : "text-ink-600 hover:bg-slate-100 hover:text-ink-900"
      }`}
    >
      <Icon className={`w-4 h-4 ${isActive ? "text-primary-700" : "text-ink-500"}`} />
      <span>{item.label}</span>
    </Link>
  );
}
