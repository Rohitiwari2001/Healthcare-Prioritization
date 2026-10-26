import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { authorize } from "@/lib/api/authorize";
import { successResponse, errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateDoctorSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  specializationId: z.string().min(1).optional(),
  qualification: z.string().min(2).max(100).optional(),
  avgConsultMinutes: z.number().int().min(1).max(120).optional(),
  active: z.boolean().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ doctorUid: string }> }
) {
  const { doctorUid } = await params;

  const authRes = await authorize(req, { anyOf: ["doctors.manage"] });
  if (!authRes.success) {
    return authRes.response;
  }

  const doctorRef = adminDb.collection("doctors").doc(doctorUid);
  const doctorSnap = await doctorRef.get();
  if (!doctorSnap.exists) {
    return errorResponse("NOT_FOUND", "Doctor profile not found", 404);
  }

  const body = await req.json().catch(() => null);
  const parsed = updateDoctorSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid doctor data", 400);
  }

  const data = parsed.data;
  const updates: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (data.name !== undefined) updates.name = data.name.trim();
  if (data.qualification !== undefined) updates.qualification = data.qualification.trim();
  if (data.avgConsultMinutes !== undefined) updates.avgConsultMinutes = data.avgConsultMinutes;
  if (data.active !== undefined) updates.active = data.active;

  if (data.specializationId) {
    const specSnap = await adminDb.collection("specializations").doc(data.specializationId).get();
    if (!specSnap.exists) {
      return errorResponse("NOT_FOUND", "Specialization not found", 404);
    }
    updates.specializationId = data.specializationId;
    updates.specializationName = specSnap.data()?.name || "";
  }

  await doctorRef.update(updates);

  // If name changed, also update displayName in users collection
  if (data.name) {
    await adminDb.collection("users").doc(doctorUid).update({
      displayName: data.name.trim(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  return successResponse({ doctorUid, ...updates });
}
