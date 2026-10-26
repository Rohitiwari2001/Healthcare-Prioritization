"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged, signOut as fbSignOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { Role } from "@/lib/constants/enums";
import { PermissionKey } from "@/lib/constants/permissions";

export type Session =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "noRole"; user: User }
  | {
      status: "ready";
      user: User;
      role: Role;
      perms: Set<PermissionKey>;
      mustChangePassword: boolean;
      patientId: string | null;
    };

interface AuthContextType {
  session: Session;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: { status: "loading" },
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ status: "loading" });

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        if (unsubscribeDoc) unsubscribeDoc();
        setSession({ status: "signedOut" });
        return;
      }

      // Check token claims
      const tokenResult = await currentUser.getIdTokenResult();
      const roleClaim = tokenResult.claims.role as Role | undefined;

      if (!roleClaim) {
        setSession({ status: "noRole", user: currentUser });
        return;
      }

      // Subscribe to users/{uid} document for live permission changes & disable state
      unsubscribeDoc = onSnapshot(
        doc(db, "users", currentUser.uid),
        async (snap) => {
          if (!snap.exists()) {
            setSession({ status: "noRole", user: currentUser });
            return;
          }

          const data = snap.data();

          // If account disabled, sign out immediately
          if (data.active === false) {
            await fbSignOut(auth);
            setSession({ status: "signedOut" });
            alert("Your account has been disabled. Please contact the administrator.");
            return;
          }

          // Refresh token if document permVersion > token claims pv
          const docPv = (data.permVersion as number) || 1;
          const claimPv = (tokenResult.claims.pv as number) || 0;
          if (docPv > claimPv) {
            await currentUser.getIdToken(true);
          }

          const effectivePerms = new Set<PermissionKey>(
            (data.effectivePerms || []) as PermissionKey[]
          );

          setSession({
            status: "ready",
            user: currentUser,
            role: data.role as Role,
            perms: effectivePerms,
            mustChangePassword: !!data.mustChangePassword,
            patientId: data.patientId || null,
          });
        },
        (err) => {
          console.warn("Firestore user snapshot error, falling back to claims:", err);
          const permsClaim = (tokenResult.claims.perms || []) as PermissionKey[];
          setSession({
            status: "ready",
            user: currentUser,
            role: roleClaim,
            perms: new Set<PermissionKey>(permsClaim),
            mustChangePassword: Boolean(tokenResult.claims.mustChangePassword),
            patientId: null,
          });
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  const signOut = async () => {
    await fbSignOut(auth);
    setSession({ status: "signedOut" });
  };

  return (
    <AuthContext.Provider value={{ session, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useSession() {
  const { session, signOut } = useContext(AuthContext);
  return { ...session, signOut };
}
