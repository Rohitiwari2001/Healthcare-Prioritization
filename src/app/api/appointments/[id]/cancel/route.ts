import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { authorize } from "@/lib/api/authorize";
import { successResponse, errorResponse } from "@/lib/api/response";
import { cancelAppointmentSchema } from "@/lib/schemas/appointment";
import { writeAuditLog } from "@/lib/api/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: appointmentId } = await params;

  const authRes = await authorize(req, {
    anyOf: ["appointments.cancel_self", "appointments.cancel_for_patient"],
  });
  if (!authRes.success) {
    return authRes.response;
  }

  const callerUid = authRes.context.uid;
  const callerRole = authRes.context.role;
  const isPatient = callerRole === "patient";

  const apptRef = adminDb.collection("appointments").doc(appointmentId);
  const apptSnap = await apptRef.get();
  if (!apptSnap.exists) {
    return errorResponse("NOT_FOUND", "Appointment not found", 404);
  }

  const appt = apptSnap.data()!;

  // Patient ownership check
  if (isPatient && appt.patientUid !== callerUid) {
    return errorResponse("FORBIDDEN", "You can only cancel your own appointments", 403);
  }

  // Precondition: BOOKED or CHECKED_IN only
  if (appt.status !== "BOOKED" && appt.status !== "CHECKED_IN") {
    return errorResponse(
      "INVALID_STATE",
      `Cannot cancel appointment in status ${appt.status}`,
      409
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = cancelAppointmentSchema.safeParse(body);
  const cancelReason = parsed.success ? parsed.data.reason || "Patient cancelled" : "Patient cancelled";

  const now = new Date();

  try {
    await adminDb.runTransaction(async (transaction) => {
      // 1. Release slot if future
      if (appt.slotId) {
        const slotRef = adminDb.collection("slots").doc(appt.slotId);
        const slotSnap = await transaction.get(slotRef);
        if (slotSnap.exists) {
          const slot = slotSnap.data()!;
          if (slot.startAt && slot.startAt.toDate() > now) {
            transaction.update(slotRef, {
              status: "AVAILABLE",
              appointmentId: null,
            });
          }
        }
      }

      // 2. Mark appointment CANCELLED
      transaction.update(apptRef, {
        status: "CANCELLED",
        cancelledAt: FieldValue.serverTimestamp(),
        cancelledByUid: callerUid,
        cancelReason,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    if (!isPatient) {
      await writeAuditLog({
        actorUid: callerUid,
        actorRole: callerRole,
        action: "APPOINTMENT_CANCELLED_ON_BEHALF",
        targetType: "APPOINTMENT",
        targetId: appointmentId,
        appointmentId,
        reason: cancelReason,
      });
    }

    return successResponse({ status: "CANCELLED" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to cancel appointment";
    return errorResponse("INTERNAL_ERROR", msg, 500);
  }
}
