"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { todayKey } from "@/lib/time";
import { sortQueue } from "@/lib/priority-engine";
import { useActiveConfig } from "./use-active-config";
import { QueueItem } from "@/lib/priority-engine/types";

export interface LiveQueueAppointment extends QueueItem {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender?: string;
  doctorId: string;
  doctorName?: string;
  source: "ONLINE" | "RECEPTION" | "WALK_IN";
  emergencyFlag: boolean;
  baseScore: number;
  breakdown?: {
    severityPts: number;
    agePts: number;
    urgencyPts: number;
  };
  manualAdjustment?: number | null;
  overrideReason?: string | null;
  overriddenByUid?: string | null;
  checkInTime: string | null;
  tieBreakAt: string;
  scheduledStartAt?: string | null;
  startTime?: string | null;
  status: "CHECKED_IN" | "IN_PROGRESS";
  aging: number;
  finalScore: number;
}

export function useLiveQueue(doctorUid?: string | null) {
  const config = useActiveConfig();
  const [now, setNow] = useState<number>(Date.now());
  const [rawAppts, setRawAppts] = useState<LiveQueueAppointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Recompute aging every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 30_000);
    return () => clearInterval(timer);
  }, []);

  const today = todayKey(now);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const apptsCol = collection(db, "appointments");
    let q;

    if (doctorUid) {
      q = query(
        apptsCol,
        where("dateKey", "==", today),
        where("doctorId", "==", doctorUid)
      );
    } else {
      q = query(apptsCol, where("dateKey", "==", today));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const appts: LiveQueueAppointment[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          if (d.status === "CHECKED_IN" || d.status === "IN_PROGRESS") {
            const checkInTime = d.checkInTime?.toDate
              ? d.checkInTime.toDate().toISOString()
              : d.checkInTime || null;
            const tieBreakAt = d.tieBreakAt?.toDate
              ? d.tieBreakAt.toDate().toISOString()
              : d.tieBreakAt || d.bookingTime?.toDate?.()?.toISOString() || new Date().toISOString();
            const scheduledStartAt = d.scheduledStartAt?.toDate
              ? d.scheduledStartAt.toDate().toISOString()
              : d.scheduledStartAt || null;
            const startTime = d.startTime?.toDate
              ? d.startTime.toDate().toISOString()
              : d.startTime || null;

            appts.push({
              id: docSnap.id,
              patientId: d.patientId,
              patientName: d.patientName || "Unknown",
              patientAge: d.patientAge ?? 0,
              patientGender: d.patientGender,
              doctorId: d.doctorId,
              doctorName: d.doctorName,
              source: d.source || "ONLINE",
              emergencyFlag: !!d.emergencyFlag,
              baseScore: d.baseScore ?? 0,
              breakdown: d.breakdown,
              manualAdjustment: d.manualAdjustment ?? 0,
              overrideReason: d.overrideReason || null,
              overriddenByUid: d.overriddenByUid || null,
              checkInTime,
              tieBreakAt,
              scheduledStartAt,
              startTime,
              status: d.status,
              aging: 0,
              finalScore: 0,
            });
          }
        });

        setRawAppts(appts);
        setLoading(false);
      },
      (err) => {
        console.error("useLiveQueue error:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [today, doctorUid]);

  const queue = useMemo(() => {
    if (!rawAppts.length) return [];
    return sortQueue(rawAppts, now, config.params) as LiveQueueAppointment[];
  }, [rawAppts, now, config.params]);

  return {
    queue,
    loading: loading || config.loading,
    error,
    now,
    configParams: config.params,
  };
}
