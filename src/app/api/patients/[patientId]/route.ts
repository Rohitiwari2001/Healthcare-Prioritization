import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { authorize } from "@/lib/api/authorize";
import { successResponse, errorResponse } from "@/lib/api/response";
import { updatePatientProfileSchema } from "@/lib/schemas/patient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { patientId } = await params;

  const authRes = await authorize(req);
  if (!authRes.success) {
    return authRes.response;
  }

  const patientRef = adminDb.collection("patients").doc(patientId);
  const patientSnap = await patientRef.get();
  if (!patientSnap.exists) {
    return errorResponse("NOT_FOUND", "Patient record not found", 404);
  }

  const patientData = patientSnap.data()!;
  const callerUid = authRes.context.uid;
  const isOwner = patientData.uid === callerUid;
  const hasStaffPerm = authRes.context.perms.has("patients.create_profile");

  if (!isOwner && !hasStaffPerm) {
    return errorResponse("FORBIDDEN", "You do not have permission to edit this profile", 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = updatePatientProfileSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid update data", 400);
  }

  const data = parsed.data;
  const updates: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (data.name !== undefined) {
    updates.name = data.name.trim();
    updates.nameLower = data.name.trim().toLowerCase();
  }

  if (data.phone !== undefined) {
    let cleanPhone = data.phone.trim();
    if (!cleanPhone.startsWith("+")) cleanPhone = `+91${cleanPhone}`;
    updates.phone = cleanPhone;
  }

  if (data.dob !== undefined) updates.dob = data.dob;
  if (data.gender !== undefined) updates.gender = data.gender;
  if (data.bloodGroup !== undefined) updates.bloodGroup = data.bloodGroup || null;
  if (data.abhaId !== undefined) updates.abhaId = data.abhaId || null;

  await patientRef.update(updates);

  // If patient edited their own display name, also update their user document
  if (isOwner && data.name) {
    await adminDb.collection("users").doc(callerUid).update({
      displayName: data.name.trim(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  return successResponse({ patientId, ...updates });
}
