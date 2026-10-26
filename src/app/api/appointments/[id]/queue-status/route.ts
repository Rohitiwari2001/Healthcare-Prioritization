import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { authorize } from "@/lib/api/authorize";
import { successResponse, errorResponse } from "@/lib/api/response";
import { sortQueue } from "@/lib/priority-engine/engine";
import { DEFAULT_CONFIG_PARAMS } from "@/lib/priority-engine/default-config";
import { PriorityConfigParams, QueueItem } from "@/lib/priority-engine/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: appointmentId } = await params;

  const authRes = await authorize(req);
  if (!authRes.success) {
    return authRes.response;
  }

  const callerUid = authRes.context.uid;

  const apptSnap = await adminDb.collection("appointments").doc(appointmentId).get();
  if (!apptSnap.exists) {
    return errorResponse("NOT_FOUND", "Appointment not found", 404);
  }

  const appt = apptSnap.data()!;

  // Ownership check: Caller must be the owning patient (or staff with queue.view_all)
  const isOwner = appt.patientUid === callerUid;
  const isStaff = authRes.context.perms.has("queue.view_all") || authRes.context.perms.has("queue.view_own");
  if (!isOwner && !isStaff) {
    return errorResponse("FORBIDDEN", "You can only view queue position for your own appointment", 403);
  }

  // If not checked in or in progress, return null queue metrics
  if (appt.status !== "CHECKED_IN" && appt.status !== "IN_PROGRESS") {
    return successResponse({
      status: appt.status,
      position: null,
      patientsAhead: null,
      estimatedWaitMinutes: null,
      emergencyFlag: appt.emergencyFlag || false,
    });
  }

  // 1. Load active config
  let activeParams: PriorityConfigParams = DEFAULT_CONFIG_PARAMS;
  try {
    const metaSnap = await adminDb.collection("meta").doc("activeConfig").get();
    if (metaSnap.exists) {
      const ver = metaSnap.data()?.version || 1;
      const verSnap = await adminDb.collection("configVersions").doc(String(ver)).get();
      if (verSnap.exists) {
        activeParams = verSnap.data()?.params || DEFAULT_CONFIG_PARAMS;
      }
    }
  } catch (err) {
    console.error("Error reading active config for queue status:", err);
  }

  // 2. Load doctor info for avgConsultMinutes
  const doctorSnap = await adminDb.collection("doctors").doc(appt.doctorId).get();
  const avgConsultMinutes = doctorSnap.data()?.avgConsultMinutes || 12;

  // 3. Read doctor's today queue appointments
  const queueSnap = await adminDb
    .collection("appointments")
    .where("doctorId", "==", appt.doctorId)
    .where("dateKey", "==", appt.dateKey)
    .where("status", "in", ["CHECKED_IN", "IN_PROGRESS"])
    .get();

  const now = new Date();
  const queueItems = queueSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      baseScore: data.baseScore,
      checkInTime: data.checkInTime ? data.checkInTime.toDate() : now,
      manualAdjustment: data.manualAdjustment || 0,
      tieBreakAt: data.tieBreakAt ? data.tieBreakAt.toDate() : now,
      status: data.status,
    } as QueueItem;
  });

  // 4. Sort queue with shared engine
  const sorted = sortQueue(queueItems, now, activeParams);

  // 5. Find index of this appointment
  const index = sorted.findIndex((item) => item.id === appointmentId);
  if (index === -1) {
    return successResponse({
      status: appt.status,
      position: 1,
      patientsAhead: 0,
      estimatedWaitMinutes: 0,
      emergencyFlag: appt.emergencyFlag || false,
    });
  }

  const position = index + 1;
  const patientsAhead = index;
  const someoneInProgress = sorted.some((item) => item.status === "IN_PROGRESS");
  const estimatedWaitMinutes = Math.max(
    0,
    (patientsAhead + (someoneInProgress && sorted[0].id !== appointmentId ? 1 : 0)) * avgConsultMinutes
  );

  return successResponse({
    status: appt.status,
    position,
    patientsAhead,
    estimatedWaitMinutes,
    emergencyFlag: appt.emergencyFlag || false,
    note: "Your position can change if more urgent patients arrive.",
  });
}
