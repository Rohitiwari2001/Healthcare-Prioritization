import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { authorize } from "@/lib/api/authorize";
import { successResponse, errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSpecSchema = z.object({
  name: z.string().min(2).max(60),
  nameHi: z.string().max(60).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const authRes = await authorize(req, { anyOf: ["specializations.manage"] });
  if (!authRes.success) {
    return authRes.response;
  }

  const body = await req.json().catch(() => null);
  const parsed = createSpecSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid specialization data", 400);
  }

  const { name, nameHi } = parsed.data;

  // Check unique ignoring case
  const existingSnap = await adminDb.collection("specializations").get();
  const duplicate = existingSnap.docs.some(
    (doc) => doc.data().name?.toLowerCase() === name.trim().toLowerCase()
  );
  if (duplicate) {
    return errorResponse("DUPLICATE", "A specialization with this name already exists", 409);
  }

  const id = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const docRef = adminDb.collection("specializations").doc(id);

  await docRef.set({
    name: name.trim(),
    nameHi: nameHi?.trim() || null,
    active: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return successResponse({ id }, 201);
}
