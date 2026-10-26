import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { authorize } from "@/lib/api/authorize";
import { successResponse, errorResponse } from "@/lib/api/response";
import { createPatientProfileSchema } from "@/lib/schemas/patient";
import { writeAuditLog } from "@/lib/api/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authRes = await authorize(req, { anyOf: ["patients.create_profile"] });
  if (!authRes.success) {
    return authRes.response;
  }

  const callerUid = authRes.context.uid;
  const callerRole = authRes.context.role;

  const body = await req.json().catch(() => null);
  const parsed = createPatientProfileSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "VALIDATION_ERROR",
      "Invalid patient profile data",
      400,
      parsed.error.errors.map((e) => ({
        field: e.path.join("."),
        issue: e.message,
      }))
    );
  }

  const data = parsed.data;

  let cleanPhone = data.phone.trim();
  if (!cleanPhone.startsWith("+")) {
    cleanPhone = `+91${cleanPhone}`;
  }

  const nameLower = data.name.trim().toLowerCase();

  // Soft duplicate check
  if (!data.confirmNew) {
    const existingSnap = await adminDb
      .collection("patients")
      .where("phone", "==", cleanPhone)
      .where("mergedInto", "==", null)
      .get();

    const matchingDoc = existingSnap.docs.find((d) => {
      const p = d.data();
      return p.nameLower === nameLower && p.dob === data.dob;
    });

    if (matchingDoc) {
      return errorResponse(
        "POSSIBLE_DUPLICATE",
        "A matching patient profile already exists with this phone number and name",
        409,
        [{ field: "patientId", issue: matchingDoc.id }]
      );
    }
  }

  const patientRef = adminDb.collection("patients").doc();
  const countersRef = adminDb.collection("meta").doc("counters");
  let patientCode = "";

  try {
    await adminDb.runTransaction(async (t) => {
      const countersSnap = await t.get(countersRef);
      let currentSeq = 0;
      if (countersSnap.exists) {
        currentSeq = countersSnap.data()?.patientSeq || 0;
      }
      const nextSeq = currentSeq + 1;
      patientCode = `P-${String(nextSeq).padStart(6, "0")}`;

      t.set(
        countersRef,
        { patientSeq: nextSeq, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );

      t.set(patientRef, {
        uid: null,
        patientCode,
        name: data.name.trim(),
        nameLower,
        phone: cleanPhone,
        dob: data.dob,
        gender: data.gender,
        bloodGroup: data.bloodGroup || null,
        abhaId: data.abhaId || null,
        createdVia: "RECEPTION",
        createdByUid: callerUid,
        mergedInto: null,
        linkedAt: null,
        linkedByUid: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    await writeAuditLog({
      actorUid: callerUid,
      actorRole: callerRole,
      action: "PATIENT_PROFILE_CREATED",
      targetType: "PATIENT",
      targetId: patientRef.id,
      newValue: { patientCode, name: data.name, phone: cleanPhone },
      reason: "Walk-in patient profile created at reception desk",
    });

    return successResponse({ patientId: patientRef.id, patientCode }, 201);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create patient profile";
    return errorResponse("INTERNAL_ERROR", msg, 500);
  }
}
