import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { authorize } from "@/lib/api/authorize";
import { successResponse, errorResponse } from "@/lib/api/response";
import { updateUserAccessSchema } from "@/lib/schemas/admin";
import { computeEffectivePermissions, PermissionKey } from "@/lib/constants/permissions";
import { writeAuditLog } from "@/lib/api/audit";
import { Role } from "@/lib/constants/enums";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const { uid: targetUid } = await params;

  const authRes = await authorize(req, { anyOf: ["permissions.manage"] });
  if (!authRes.success) {
    return authRes.response;
  }

  const callerUid = authRes.context.uid;
  const callerRole = authRes.context.role;

  // Safety rail 1: No self-service
  if (callerUid === targetUid) {
    return errorResponse(
      "SELF_ACCESS_CHANGE_BLOCKED",
      "Administrators cannot modify their own administrative access",
      403
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = updateUserAccessSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "VALIDATION_ERROR",
      "Invalid access update data",
      400,
      parsed.error.errors.map((e) => ({
        field: e.path.join("."),
        issue: e.message,
      }))
    );
  }

  const data = parsed.data;

  // If changing active status, users.manage is also required
  if (data.active !== undefined && !authRes.context.perms.has("users.manage")) {
    return errorResponse("FORBIDDEN", "users.manage permission is required to enable or disable accounts", 403);
  }

  // Load target user document
  const targetUserSnap = await adminDb.collection("users").doc(targetUid).get();
  if (!targetUserSnap.exists) {
    return errorResponse("NOT_FOUND", "Target user document not found", 404);
  }

  const targetUser = targetUserSnap.data()!;
  const currentRole = targetUser.role as Role;
  const currentActive = targetUser.active !== false;

  // Safety rail 3: Role change restrictions
  if (data.role && data.role !== currentRole) {
    const isAllowedSwap =
      (currentRole === "receptionist" && data.role === "admin") ||
      (currentRole === "admin" && data.role === "receptionist");

    if (!isAllowedSwap) {
      return errorResponse(
        "ROLE_CHANGE_NOT_SUPPORTED",
        "Role changes involving doctors or patients are not supported directly",
        400
      );
    }
  }

  // Safety rail 2: Last active admin protection
  const targetIsAdmin = currentRole === "admin";
  const willLoseAdmin = (data.role && data.role !== "admin") || data.active === false;

  if (targetIsAdmin && willLoseAdmin) {
    // Check how many other active admins exist
    const adminsSnap = await adminDb
      .collection("users")
      .where("role", "==", "admin")
      .where("active", "==", true)
      .get();

    const otherAdmins = adminsSnap.docs.filter((d) => d.id !== targetUid);
    if (otherAdmins.length === 0) {
      return errorResponse(
        "LAST_ADMIN",
        "Cannot demote or disable the only remaining active administrator",
        409
      );
    }
  }

  const newRole = data.role || currentRole;
  const newActive = data.active !== undefined ? data.active : currentActive;
  const newGrants = (data.grants !== undefined ? data.grants : targetUser.grants || []) as PermissionKey[];
  const newDenies = (data.denies !== undefined ? data.denies : targetUser.denies || []) as PermissionKey[];

  const newEffectivePerms = computeEffectivePermissions(newRole, newGrants, newDenies, newActive);
  const nextPermVersion = (targetUser.permVersion || 1) + 1;

  try {
    // 1. Update Firestore user document
    await adminDb.collection("users").doc(targetUid).update({
      role: newRole,
      active: newActive,
      grants: newGrants,
      denies: newDenies,
      effectivePerms: newEffectivePerms,
      permVersion: nextPermVersion,
      updatedAt: FieldValue.serverTimestamp(),
      ...(data.active === false
        ? { disabledAt: FieldValue.serverTimestamp(), disabledReason: data.reason }
        : {}),
    });

    // 2. Update Firebase Auth claims & disabled state
    await adminAuth.setCustomUserClaims(targetUid, {
      role: newRole,
      perms: newEffectivePerms,
      pv: nextPermVersion,
    });

    if (data.active !== undefined) {
      await adminAuth.updateUser(targetUid, {
        disabled: !newActive,
      });

      if (!newActive) {
        await adminAuth.revokeRefreshTokens(targetUid);
      }
    }

    // 3. Audit log writes
    if (data.role && data.role !== currentRole) {
      await writeAuditLog({
        actorUid: callerUid,
        actorRole: callerRole,
        action: "ROLE_CHANGED",
        targetType: "USER",
        targetId: targetUid,
        oldValue: { role: currentRole },
        newValue: { role: newRole },
        reason: data.reason,
      });
    }

    if (data.active !== undefined && data.active !== currentActive) {
      await writeAuditLog({
        actorUid: callerUid,
        actorRole: callerRole,
        action: newActive ? "USER_ENABLED" : "USER_DISABLED",
        targetType: "USER",
        targetId: targetUid,
        oldValue: { active: currentActive },
        newValue: { active: newActive },
        reason: data.reason,
      });
    }

    if (data.grants !== undefined || data.denies !== undefined) {
      await writeAuditLog({
        actorUid: callerUid,
        actorRole: callerRole,
        action: "PERMISSION_GRANTED",
        targetType: "USER",
        targetId: targetUid,
        oldValue: { grants: targetUser.grants, denies: targetUser.denies },
        newValue: { grants: newGrants, denies: newDenies },
        reason: data.reason,
      });
    }

    return successResponse({
      role: newRole,
      active: newActive,
      effectivePerms: newEffectivePerms,
      permVersion: nextPermVersion,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update user access";
    return errorResponse("INTERNAL_ERROR", msg, 500);
  }
}
