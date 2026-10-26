import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { authorize } from "@/lib/api/authorize";
import { successResponse, errorResponse } from "@/lib/api/response";
import { linkAccountSchema } from "@/lib/schemas/patient";
import { writeAuditLog } from "@/lib/api/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { patientId: sourcePatientId } = await params;

  const authRes = await authorize(req, { anyOf: ["patients.create_profile"] });
  if (!authRes.success) {
    return authRes.response;
  }

  const callerUid = authRes.context.uid;
  const callerRole = authRes.context.role;

  const body = await req.json().catch(() => null);
  const parsed = linkAccountSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid linking payload", 400);
  }

  const { targetPatientId, confirmedBy } = parsed.data;

  // Preconditions:
  // 1. source profile exists, has uid == null, mergedInto == null
  const sourceRef = adminDb.collection("patients").doc(sourcePatientId);
  const sourceSnap = await sourceRef.get();
  if (!sourceSnap.exists) {
    return errorResponse("NOT_FOUND", "Source offline profile not found", 404);
  }

  const sourceData = sourceSnap.data()!;
  if (sourceData.uid !== null || sourceData.mergedInto !== null) {
    return errorResponse("INVALID_LINK", "Source profile is already linked or registered online", 409);
  }

  // 2. target profile exists, has uid != null
  const targetRef = adminDb.collection("patients").doc(targetPatientId);
  const targetSnap = await targetRef.get();
  if (!targetSnap.exists) {
    return errorResponse("NOT_FOUND", "Target registered patient profile not found", 404);
  }

  const targetData = targetSnap.data()!;
  if (!targetData.uid) {
    return errorResponse("INVALID_LINK", "Target profile must be a registered online account", 409);
  }

  const targetUid = targetData.uid;
  const targetName = targetData.name;

  try {
    // Find all appointments pointing to source
    const apptsSnap = await adminDb
      .collection("appointments")
      .where("patientId", "==", sourcePatientId)
      .get();

    const batch = adminDb.batch();

    // 1. Mark source as merged
    batch.update(sourceRef, {
      mergedInto: targetPatientId,
      linkedAt: FieldValue.serverTimestamp(),
      linkedByUid: callerUid,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 2. Repoint all appointments
    for (const apptDoc of apptsSnap.docs) {
      batch.update(apptDoc.ref, {
        patientId: targetPatientId,
        patientUid: targetUid,
        patientName: targetName,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    // 3. Audit log
    await writeAuditLog({
      actorUid: callerUid,
      actorRole: callerRole,
      action: "PATIENT_LINKED",
      targetType: "PATIENT",
      targetId: sourcePatientId,
      oldValue: { patientId: sourcePatientId, uid: null },
      newValue: { targetPatientId, targetUid },
      reason: `Staff confirmed identity: ${confirmedBy}`,
    });

    return successResponse({ movedAppointments: apptsSnap.size });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to link patient profiles";
    return errorResponse("INTERNAL_ERROR", msg, 500);
  }
}
