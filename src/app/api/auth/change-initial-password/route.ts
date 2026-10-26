import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { authorize } from "@/lib/api/authorize";
import { successResponse, errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const changePasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/\d/, "Password must contain at least one number"),
});

export async function POST(req: NextRequest) {
  const authRes = await authorize(req, { allowPasswordChange: true });
  if (!authRes.success) {
    return authRes.response;
  }

  const { uid, userDoc } = authRes.context;

  if (!userDoc.mustChangePassword) {
    return errorResponse("NOT_REQUIRED", "Initial password change is not required for this account", 409);
  }

  const body = await req.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "WEAK_PASSWORD",
      parsed.error.errors[0]?.message || "Password does not meet complexity requirements",
      400
    );
  }

  const { newPassword } = parsed.data;

  if (userDoc.email && newPassword.toLowerCase() === userDoc.email.toLowerCase()) {
    return errorResponse("WEAK_PASSWORD", "Password cannot be the same as your email address", 400);
  }

  try {
    // 1. Update password in Firebase Auth
    await adminAuth.updateUser(uid, {
      password: newPassword,
    });

    // 2. Clear mustChangePassword flag in Firestore
    await adminDb.collection("users").doc(uid).update({
      mustChangePassword: false,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 3. Revoke refresh tokens so subsequent operations require fresh authentication
    await adminAuth.revokeRefreshTokens(uid);

    return successResponse({ signedOut: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to change initial password";
    return errorResponse("INTERNAL_ERROR", msg, 500);
  }
}
