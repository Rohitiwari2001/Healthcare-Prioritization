import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { authorize } from "@/lib/api/authorize";
import { successResponse, errorResponse } from "@/lib/api/response";
import { editSymptomsSchema } from "@/lib/schemas/appointment";
import { computeBase } from "@/lib/priority-engine/engine";
import { DEFAULT_CONFIG_PARAMS } from "@/lib/priority-engine/default-config";
import { PriorityConfigParams } from "@/lib/priority-engine/types";
import { writeAuditLog } from "@/lib/api/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: appointmentId } = await params;

  const authRes = await authorize(req, {
    anyOf: ["appointments.edit_symptoms_self", "appointments.edit_symptoms_for_patient"],
  });
  if (!authRes.success) {
    return authRes.response;
  }

  const callerUid = authRes.context.uid;
  const callerRole = authRes.context.role;
  const isPatient = callerRole === "patient";

  const apptRef = adminDb.collection("appointments").doc(appointmentId);
  const apptSnap = await apptRef.get();
  if (!apptSnap.exists) {
    return errorResponse("NOT_FOUND", "Appointment not found", 404);
  }

  const appt = apptSnap.data()!;

  // Ownership check for patients
  if (isPatient && appt.patientUid !== callerUid) {
    return errorResponse("FORBIDDEN", "You can only edit symptoms for your own appointments", 403);
  }

  // Precondition: status must be BOOKED
  if (appt.status !== "BOOKED") {
    return errorResponse(
      "INVALID_STATE",
      "Symptoms can only be modified before check-in. Once checked in, the form is locked.",
      409
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = editSymptomsSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid symptom data", 400);
  }

  const { assessment } = parsed.data;

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

  const scoreResult = computeBase({ age: appt.patientAge }, assessment, activeParams);

  try {
    const batch = adminDb.batch();

    batch.update(apptRef, {
      severityEffective: scoreResult.severityEffective,
      severityPts: scoreResult.severityPts,
      agePts: scoreResult.agePts,
      urgencyPts: scoreResult.urgencyPts,
      baseScore: scoreResult.baseScore,
      emergencyFlag: scoreResult.emergencyFlag,
      configVersion: activeVersion,
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

    await writeAuditLog({
      actorUid: callerUid,
      actorRole: callerRole,
      action: "SYMPTOMS_EDITED",
      targetType: "APPOINTMENT",
      targetId: appointmentId,
      appointmentId,
      oldValue: { baseScore: appt.baseScore },
      newValue: { baseScore: scoreResult.baseScore },
      reason: "Patient/Staff edited pre-checkin symptoms assessment",
    });

    return successResponse({
      appointmentId,
      status: appt.status,
      emergencyFlag: scoreResult.emergencyFlag,
      emergencyAdvisory: scoreResult.emergencyFlag
        ? "Your answers suggest a possible emergency. Please go to the nearest emergency department or call 112 immediately."
        : undefined,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update symptoms";
    return errorResponse("INTERNAL_ERROR", msg, 500);
  }
}
