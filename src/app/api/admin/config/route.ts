import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { authorize } from "@/lib/api/authorize";
import { successResponse, errorResponse, formatZodDetails } from "@/lib/api/response";
import { updateConfigSchema, validateConfigParams } from "@/lib/schemas/admin";

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

  const parsed = updateConfigSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Validation failed", 400, formatZodDetails(parsed.error));
  }

  const { params, changeNote } = parsed.data;

  // Custom validations (severity order, age coverage 0-150)
  const validationError = validateConfigParams(params);
  if (validationError) {
    return errorResponse("VALIDATION_ERROR", validationError, 400);
  }

  try {
    const activeRef = adminDb.collection("meta").doc("activeConfig");
    const auditRef = adminDb.collection("auditLog").doc();

    const result = await adminDb.runTransaction(async (transaction) => {
      const activeSnap = await transaction.get(activeRef);
      const currentVer = activeSnap.exists ? (activeSnap.data()?.version ?? 1) : 1;
      const nextVer = currentVer + 1;

      const newConfigRef = adminDb.collection("configVersions").doc(String(nextVer));
      const nowTimestamp = FieldValue.serverTimestamp();

      transaction.set(newConfigRef, {
        version: nextVer,
        params,
        changeNote,
        createdAt: nowTimestamp,
        createdByUid: callerUid,
      });

      transaction.set(activeRef, {
        version: nextVer,
        updatedAt: nowTimestamp,
        updatedByUid: callerUid,
      }, { merge: true });

      transaction.set(auditRef, {
        timestamp: nowTimestamp,
        actorUid: callerUid,
        actorRole: callerRole,
        action: "CONFIG_UPDATED",
        targetType: "CONFIG",
        targetId: String(nextVer),
        oldValue: { version: currentVer },
        newValue: { version: nextVer },
        reason: changeNote,
      });

      return { version: nextVer };
    });

    return successResponse({ version: result.version }, 201);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update configuration";
    return errorResponse("INTERNAL_ERROR", msg, 500);
  }
}
