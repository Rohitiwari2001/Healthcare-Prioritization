import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import * as crypto from "crypto";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { authorize } from "@/lib/api/authorize";
import { successResponse, errorResponse } from "@/lib/api/response";
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
  return pass + "A1!";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const { uid: targetUid } = await params;

  const authRes = await authorize(req, { anyOf: ["users.manage"] });
  if (!authRes.success) {
    return authRes.response;
  }

  const callerUid = authRes.context.uid;
  const callerRole = authRes.context.role;

  if (callerUid === targetUid) {
    return errorResponse(
      "SELF_ACCESS_CHANGE_BLOCKED",
      "Administrators cannot reset their own password here",
      403
    );
  }

  const targetUserSnap = await adminDb.collection("users").doc(targetUid).get();
  if (!targetUserSnap.exists) {
    return errorResponse("NOT_FOUND", "User not found", 404);
  }

  const targetUser = targetUserSnap.data()!;
  if (targetUser.role === "patient") {
    return errorResponse(
      "INVALID_STATE",
      "Patient accounts must use the self-service Forgot Password reset",
      400
    );
  }

  const temporaryPassword = generateTemporaryPassword();

  try {
    await adminAuth.updateUser(targetUid, {
      password: temporaryPassword,
    });

    await adminDb.collection("users").doc(targetUid).update({
      mustChangePassword: true,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await adminAuth.revokeRefreshTokens(targetUid);

    await writeAuditLog({
      actorUid: callerUid,
      actorRole: callerRole,
      action: "PERMISSION_RESET",
      targetType: "USER",
      targetId: targetUid,
      reason: "Password reset by administrator",
    });

    return successResponse({ temporaryPassword });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to reset password";
    return errorResponse("INTERNAL_ERROR", msg, 500);
  }
}
