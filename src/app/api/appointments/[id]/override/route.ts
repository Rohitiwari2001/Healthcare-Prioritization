import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { authorize } from "@/lib/api/authorize";
import { successResponse, errorResponse, formatZodDetails } from "@/lib/api/response";
import { overridePrioritySchema } from "@/lib/schemas/appointment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: appointmentId } = await params;

  const authRes = await authorize(req, {
    anyOf: ["priority.override"],
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

  const parsed = overridePrioritySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Validation failed", 400, formatZodDetails(parsed.error));
  }

  const { manualAdjustment, reason } = parsed.data;
  const apptRef = adminDb.collection("appointments").doc(appointmentId);
  const auditRef = adminDb.collection("auditLog").doc();

  try {
    const result = await adminDb.runTransaction(async (transaction) => {
      const apptDoc = await transaction.get(apptRef);
      if (!apptDoc.exists) {
        throw new Error("NOT_FOUND");
      }

      const appt = apptDoc.data()!;

      // Doctors can only override their own appointments; admins can override any
      if (callerRole === "doctor" && appt.doctorId !== callerUid) {
        throw new Error("FORBIDDEN");
      }

      // Precondition: Patient must be CHECKED_IN
      if (appt.status !== "CHECKED_IN") {
        throw new Error("INVALID_STATE");
      }

      const currentAdjustment = appt.manualAdjustment ?? 0;
      if (currentAdjustment === manualAdjustment) {
        throw new Error("VALUE_UNCHANGED");
      }

      const nowTimestamp = FieldValue.serverTimestamp();

      transaction.update(apptRef, {
        manualAdjustment,
        overrideReason: reason,
        overriddenByUid: callerUid,
        overriddenAt: nowTimestamp,
        updatedAt: nowTimestamp,
      });

      transaction.set(auditRef, {
        timestamp: nowTimestamp,
        actorUid: callerUid,
        actorRole: callerRole,
        action: "PRIORITY_OVERRIDE",
        targetType: "APPOINTMENT",
        targetId: appointmentId,
        appointmentId,
        oldValue: { manualAdjustment: currentAdjustment },
        newValue: { manualAdjustment },
        reason,
      });

      return { manualAdjustment };
    });

    return successResponse({
      manualAdjustment: result.manualAdjustment,
      overriddenAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === "NOT_FOUND") {
        return errorResponse("NOT_FOUND", "Appointment not found", 404);
      }
      if (err.message === "FORBIDDEN") {
        return errorResponse("FORBIDDEN", "You can only override priority for your assigned patients", 403);
      }
      if (err.message === "INVALID_STATE") {
        return errorResponse("INVALID_STATE", "Priority can only be overridden for checked-in patients", 409);
      }
      if (err.message === "VALUE_UNCHANGED") {
        return errorResponse("VALIDATION_ERROR", "The new priority adjustment must differ from the current value", 400);
      }
    }
    const msg = err instanceof Error ? err.message : "Failed to override priority";
    return errorResponse("INTERNAL_ERROR", msg, 500);
  }
}
