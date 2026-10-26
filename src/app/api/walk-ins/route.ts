import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { authorize } from "@/lib/api/authorize";
import { successResponse, errorResponse } from "@/lib/api/response";
import { walkInSchema } from "@/lib/schemas/appointment";
import { computeBase } from "@/lib/priority-engine/engine";
import { DEFAULT_CONFIG_PARAMS } from "@/lib/priority-engine/default-config";
import { PriorityConfigParams } from "@/lib/priority-engine/types";
import { todayKey } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authRes = await authorize(req, {
    anyOf: ["appointments.register_walkin"],
  });
  if (!authRes.success) {
    return authRes.response;
  }

  const callerUid = authRes.context.uid;
  const callerRole = authRes.context.role;

  const body = await req.json().catch(() => null);
  const parsed = walkInSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "VALIDATION_ERROR",
      "Invalid walk-in registration data",
      400,
      parsed.error.errors.map((e) => ({
        field: e.path.join("."),
        issue: e.message,
      }))
    );
  }

  const { patientId, doctorId, assessment } = parsed.data;

  // Active config
  let activeParams: PriorityConfigParams = DEFAULT_CONFIG_PARAMS;
  let activeVersion = 1;
  try {
    const metaSnap = await adminDb.collection("meta").doc("activeConfig").get();
    if (metaSnap.exists) {
      activeVersion = metaSnap.data()?.version || 1;
      const verSnap = await adminDb.collection("configVersions").doc(String(activeVersion)).get();
      if (verSnap.exists) {
        activeParams = verSnap.data()?.params || DEFAULT_CONFIG_PARAMS;
      }
    }
  } catch (err) {
    console.error("Error reading active config:", err);
  }

  const [docSnap, patientSnap] = await Promise.all([
    adminDb.collection("doctors").doc(doctorId).get(),
    adminDb.collection("patients").doc(patientId).get(),
  ]);

  if (!docSnap.exists || docSnap.data()?.active === false) {
    return errorResponse("DOCTOR_INACTIVE", "Doctor not found or currently inactive", 409);
  }
  if (!patientSnap.exists) {
    return errorResponse("NOT_FOUND", "Patient record not found", 404);
  }

  const doctorData = docSnap.data()!;
  const patientData = patientSnap.data()!;
  const dateKey = todayKey();

  // Check if patient is already in this doctor's active queue today
  const existingQueueSnap = await adminDb
    .collection("appointments")
    .where("doctorId", "==", doctorId)
    .where("patientId", "==", patientId)
    .where("dateKey", "==", dateKey)
    .where("status", "in", ["CHECKED_IN", "IN_PROGRESS"])
    .get();

  if (!existingQueueSnap.empty) {
    return errorResponse("ALREADY_IN_QUEUE", "Patient is already checked into this doctor's queue today", 409);
  }

  const dobYear = new Date(patientData.dob).getFullYear();
  const patientAge = Math.max(0, new Date().getFullYear() - dobYear);

  const scoreResult = computeBase({ age: patientAge }, assessment, activeParams);

  const apptRef = adminDb.collection("appointments").doc();

  try {
    const batch = adminDb.batch();

    batch.set(apptRef, {
      id: apptRef.id,
      patientId,
      patientUid: patientData.uid || null,
      patientName: patientData.name,
      patientAge,
      doctorId,
      doctorName: doctorData.name,
      specializationName: doctorData.specializationName,
      slotId: null,
      dateKey,
      scheduledStartAt: null,
      type: "WALK_IN",
      bookedByUid: callerUid,
      bookedByRole: callerRole,
      status: "CHECKED_IN",
      bookingTime: FieldValue.serverTimestamp(),
      checkInTime: FieldValue.serverTimestamp(),
      startTime: null,
      endTime: null,
      tieBreakAt: FieldValue.serverTimestamp(),
      severityEffective: scoreResult.severityEffective,
      severityPts: scoreResult.severityPts,
      agePts: scoreResult.agePts,
      urgencyPts: scoreResult.urgencyPts,
      baseScore: scoreResult.baseScore,
      emergencyFlag: scoreResult.emergencyFlag,
      manualAdjustment: 0,
      overrideReason: null,
      overriddenByUid: null,
      overriddenAt: null,
      configVersion: activeVersion,
      cancelledAt: null,
      cancelledByUid: null,
      cancelReason: null,
      noShowMarkedAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const assessmentRef = apptRef.collection("clinical").doc("assessment");
    batch.set(assessmentRef, {
      chiefComplaint: assessment.chiefComplaint,
      symptoms: assessment.symptoms,
      notes: assessment.notes || null,
      severitySelf: assessment.severitySelf,
      onset: assessment.onset,
      durationHours: assessment.durationHours,
      selfUrgent: assessment.selfUrgent,
      redFlags: activeParams.redFlags.filter((rf) => assessment.symptoms.includes(rf)),
      enteredByUid: callerUid,
      enteredByRole: callerRole,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return successResponse(
      {
        appointmentId: apptRef.id,
        status: "CHECKED_IN",
        emergencyFlag: scoreResult.emergencyFlag,
        emergencyAdvisory: scoreResult.emergencyFlag
          ? "Your answers suggest a possible emergency. Please go to the nearest emergency department or call 112 immediately."
          : undefined,
        baseScore: scoreResult.baseScore,
      },
      201
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to register walk-in";
    return errorResponse("INTERNAL_ERROR", msg, 500);
  }
}
