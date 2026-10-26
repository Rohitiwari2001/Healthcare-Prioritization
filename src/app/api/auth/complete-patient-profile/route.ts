import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { authorize } from "@/lib/api/authorize";
import { successResponse, errorResponse } from "@/lib/api/response";
import { createPatientProfileSchema } from "@/lib/schemas/patient";
import { ROLE_DEFAULTS } from "@/lib/constants/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Authorize with allowRoleless: true
  const authRes = await authorize(req, { allowRoleless: true });
  if (!authRes.success) {
    return authRes.response;
  }

  const { uid } = authRes.context;

  // Confirm account has no role yet and no users document exists
  const existingUserDoc = await adminDb.collection("users").doc(uid).get();
  if (existingUserDoc.exists) {
    return errorResponse("ALREADY_REGISTERED", "This account has already completed registration", 409);
  }

  const body = await req.json().catch(() => null);
  const parsed = createPatientProfileSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "VALIDATION_ERROR",
      "Invalid profile data",
      400,
      parsed.error.errors.map((e) => ({
        field: e.path.join("."),
        issue: e.message,
      }))
    );
  }

  const data = parsed.data;

  // Normalise phone to E.164 (+91 prefix if 10 digits)
  let cleanPhone = data.phone.trim();
  if (!cleanPhone.startsWith("+")) {
    cleanPhone = `+91${cleanPhone}`;
  }

  const patientRef = adminDb.collection("patients").doc();
  const userRef = adminDb.collection("users").doc(uid);
  const countersRef = adminDb.collection("meta").doc("counters");

  let patientCode = "";

  try {
    await adminDb.runTransaction(async (transaction) => {
      // 1. Get next patient sequence counter
      const countersSnap = await transaction.get(countersRef);
      let currentSeq = 0;
      if (countersSnap.exists) {
        currentSeq = countersSnap.data()?.patientSeq || 0;
      }
      const nextSeq = currentSeq + 1;
      patientCode = `P-${String(nextSeq).padStart(6, "0")}`;

      transaction.set(
        countersRef,
        { patientSeq: nextSeq, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );

      // 2. Write patient profile document
      transaction.set(patientRef, {
        uid,
        patientCode,
        name: data.name,
        nameLower: data.name.toLowerCase(),
        phone: cleanPhone,
        dob: data.dob,
        gender: data.gender,
        bloodGroup: data.bloodGroup || null,
        abhaId: data.abhaId || null,
        createdVia: "SELF",
        createdByUid: uid,
        mergedInto: null,
        linkedAt: null,
        linkedByUid: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // 3. Write users/{uid} document
      transaction.set(userRef, {
        uid,
        email: authRes.context.userDoc.email || "",
        displayName: data.name,
        role: "patient",
        grants: [],
        denies: [],
        effectivePerms: [...ROLE_DEFAULTS.patient],
        active: true,
        mustChangePassword: false,
        permVersion: 1,
        patientId: patientRef.id,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdByUid: null,
      });
    });

    // 4. Set custom claims on Auth user
    await adminAuth.setCustomUserClaims(uid, {
      role: "patient",
      perms: [...ROLE_DEFAULTS.patient],
      pv: 1,
    });

    return successResponse({ patientId: patientRef.id, patientCode }, 201);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Registration transaction failed";
    return errorResponse("INTERNAL_ERROR", msg, 500);
  }
}
