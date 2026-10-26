import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { authorize } from "@/lib/api/authorize";
import { successResponse, errorResponse, formatZodDetails } from "@/lib/api/response";
import { setActiveConfigSchema } from "@/lib/schemas/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest) {
  const authRes = await authorize(req, {
    anyOf: ["config.edit"],
  });
  if (!authRes.success) {
    return authRes.response;
  }

  const callerUid = authRes.context.uid;
  const callerRole = authRes.context.role;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("VALIDATION_ERROR", "Invalid JSON payload", 400);
  }

  const parsed = setActiveConfigSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Validation failed", 400, formatZodDetails(parsed.error));
  }

  const { version, changeNote } = parsed.data;

  try {
    const configRef = adminDb.collection("configVersions").doc(String(version));
    const activeRef = adminDb.collection("meta").doc("activeConfig");
    const auditRef = adminDb.collection("auditLog").doc();

    const result = await adminDb.runTransaction(async (transaction) => {
      const configSnap = await transaction.get(configRef);
      if (!configSnap.exists) {
        throw new Error("NOT_FOUND");
      }

      const activeSnap = await transaction.get(activeRef);
      const currentVer = activeSnap.exists ? (activeSnap.data()?.version ?? 1) : 1;

      const nowTimestamp = FieldValue.serverTimestamp();

      transaction.set(activeRef, {
        version,
        updatedAt: nowTimestamp,
        updatedByUid: callerUid,
      }, { merge: true });

      transaction.set(auditRef, {
        timestamp: nowTimestamp,
        actorUid: callerUid,
        actorRole: callerRole,
        action: "CONFIG_UPDATED",
        targetType: "CONFIG",
        targetId: String(version),
        oldValue: { version: currentVer },
        newValue: { version },
        reason: changeNote,
      });

      return { version };
    });

    return successResponse({ version: result.version });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return errorResponse("NOT_FOUND", `Configuration version ${version} not found`, 404);
    }
    const msg = err instanceof Error ? err.message : "Failed to set active configuration";
    return errorResponse("INTERNAL_ERROR", msg, 500);
  }
}
