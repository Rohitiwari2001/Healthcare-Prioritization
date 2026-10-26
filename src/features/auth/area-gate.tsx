"use client";

import React, { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "./auth-context";
import { Role, roleHome } from "@/lib/constants/enums";
import { PermissionKey } from "@/lib/constants/permissions";

export function useCan(...anyOf: PermissionKey[]): boolean {
  const session = useSession();
  if (session.status !== "ready") return false;
  return anyOf.some((p) => session.perms.has(p));
}

export function Can({
  anyOf,
  children,
  fallback = null,
}: {
  anyOf: PermissionKey[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const allowed = useCan(...anyOf);
  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}

export function RequirePermission({
  anyOf,
  children,
}: {
  anyOf: PermissionKey[];
  children: ReactNode;
}) {
  const session = useSession();
  const allowed = useCan(...anyOf);

  if (session.status === "loading") {
    return (
      <div className="p-8 text-center text-sm text-ink-600">
        Checking permissions...
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <h2 className="text-xl font-bold text-ink-900">Access Denied</h2>
        <p className="mt-2 text-sm text-ink-600">
          You do not have the required permissions to view this page. If you believe this is an error, please contact your administrator.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

export function AreaGate({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const session = useSession();
  const router = useRouter();

  if (session.status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-ink-600">
        Loading workspace...
      </div>
    );
  }

  if (session.status === "signedOut") {
    router.replace("/login");
    return null;
  }

  if (session.status === "noRole") {
    router.replace("/register/complete");
    return null;
  }

  if (session.mustChangePassword) {
    router.replace("/change-password");
    return null;
  }

  if (session.role !== role) {
    router.replace(roleHome(session.role));
    return null;
  }

  return <>{children}</>;
}
