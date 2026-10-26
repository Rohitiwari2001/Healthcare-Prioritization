import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { authorize } from "@/lib/api/authorize";
import { successResponse, errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateSpecSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  nameHi: z.string().max(60).optional().nullable(),
  active: z.boolean().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authRes = await authorize(req, { anyOf: ["specializations.manage"] });
  if (!authRes.success) {
    return authRes.response;
  }

  const specRef = adminDb.collection("specializations").doc(id);
  const specSnap = await specRef.get();
  if (!specSnap.exists) {
    return errorResponse("NOT_FOUND", "Specialization not found", 404);
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSpecSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid update data", 400);
  }

  const data = parsed.data;
  const updates: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (data.name !== undefined) updates.name = data.name.trim();
  if (data.nameHi !== undefined) updates.nameHi = data.nameHi ? data.nameHi.trim() : null;
  if (data.active !== undefined) updates.active = data.active;

  await specRef.update(updates);

  return successResponse({ id, ...updates });
}
