import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import * as crypto from "crypto";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { authorize } from "@/lib/api/authorize";
import { successResponse, errorResponse } from "@/lib/api/response";
import { createUserSchema } from "@/lib/schemas/admin";
import { computeEffectivePermissions } from "@/lib/constants/permissions";
import { writeAuditLog } from "@/lib/api/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function generateTemporaryPassword(length = 16): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
  let pass = "";
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    pass += chars[randomBytes[i] % chars.length];
  }
  // Ensure at least one letter and one number
  return pass + "A1!";
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "VALIDATION_ERROR",
      "Invalid user creation data",
      400,
      parsed.error.errors.map((e) => ({
        field: e.path.join("."),
        issue: e.message,
      }))
    );
  }

  const data = parsed.data;

  // Authorization check: users.manage required, plus doctors.manage if role is doctor
  const requiredPerms: ("users.manage" | "doctors.manage")[] = ["users.manage"];
  if (data.role === "doctor") {
    requiredPerms.push("doctors.manage");
  }

  const authRes = await authorize(req, { anyOf: requiredPerms });
  if (!authRes.success) {
    return authRes.response;
  }

  const callerUid = authRes.context.uid;
  const callerRole = authRes.context.role;

  // If role is doctor, doctorProfile must be present
  if (data.role === "doctor" && !data.doctorProfile) {
    return errorResponse("VALIDATION_ERROR", "doctorProfile is required for doctor accounts", 400);
  }

  // Check if specialization exists
  let specializationName = "";
  if (data.role === "doctor" && data.doctorProfile) {
    const specSnap = await adminDb
      .collection("specializations")
      .doc(data.doctorProfile.specializationId)
      .get();
    if (!specSnap.exists) {
      return errorResponse("NOT_FOUND", "Specialization not found", 404);
    }
    specializationName = specSnap.data()?.name || "";
  }

  const temporaryPassword = generateTemporaryPassword();
  const effectivePerms = computeEffectivePermissions(data.role, data.grants, data.denies, true);

  try {
    // 1. Create user in Firebase Auth
    const userRecord = await adminAuth.createUser({
      email: data.email,
      password: temporaryPassword,
      displayName: data.displayName,
    });

    const newUid = userRecord.uid;

    // 2. Set custom claims
    await adminAuth.setCustomUserClaims(newUid, {
      role: data.role,
      perms: effectivePerms,
      pv: 1,
    });

    // 3. Write users/{uid} document
    await adminDb.collection("users").doc(newUid).set({
      uid: newUid,
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      grants: data.grants || [],
      denies: data.denies || [],
      effectivePerms,
      active: true,
      mustChangePassword: true,
      permVersion: 1,
      patientId: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdByUid: callerUid,
    });

    // 4. If doctor, write doctors/{uid}
    if (data.role === "doctor" && data.doctorProfile) {
      await adminDb.collection("doctors").doc(newUid).set({
        uid: newUid,
        name: data.displayName,
        specializationId: data.doctorProfile.specializationId,
        specializationName,
        qualification: data.doctorProfile.qualification,
        avgConsultMinutes: data.doctorProfile.avgConsultMinutes,
        active: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // 5. Append audit log
    await writeAuditLog({
      actorUid: callerUid,
      actorRole: callerRole,
      action: "USER_CREATED",
      targetType: "USER",
      targetId: newUid,
      oldValue: null,
      newValue: {
        email: data.email,
        role: data.role,
        displayName: data.displayName,
        effectivePerms,
      },
      reason: `User account created with role ${data.role}`,
    });

    return successResponse({ uid: newUid, temporaryPassword }, 201);
  } catch (err: any) {
    if (err?.code === "auth/email-already-exists") {
      return errorResponse("EMAIL_IN_USE", "An account with this email address already exists", 409);
    }
    const msg = err instanceof Error ? err.message : "Failed to create user account";
    return errorResponse("INTERNAL_ERROR", msg, 500);
  }
}
