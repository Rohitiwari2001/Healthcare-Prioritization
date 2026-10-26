import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { authorize } from "@/lib/api/authorize";
import { successResponse, errorResponse } from "@/lib/api/response";
import { todayKey } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: appointmentId } = await params;

  const authRes = await authorize(req, {
    anyOf: ["appointments.checkin_self", "appointments.checkin_for_patient"],
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
    return errorResponse("FORBIDDEN", "You can only check in for your own appointment", 403);
  }

  // Precondition 1: Status must be BOOKED
  if (appt.status !== "BOOKED") {
    return errorResponse(
      "INVALID_STATE",
      `Cannot check in an appointment in status ${appt.status}`,
      409
    );
  }

  // Precondition 2: Must be today's clinic date
  const today = todayKey();
  if (appt.dateKey !== today) {
    return errorResponse(
      "NOT_TODAY",
      "Check-in is only allowed on the scheduled date of your appointment",
      409
    );
  }

  try {
    const nowTimestamp = FieldValue.serverTimestamp();

    await adminDb.runTransaction(async (transaction) => {
      transaction.update(apptRef, {
        status: "CHECKED_IN",
        checkInTime: nowTimestamp,
        updatedAt: nowTimestamp,
      });
    });

    return successResponse({
      status: "CHECKED_IN",
      checkInTime: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to check in";
    return errorResponse("INTERNAL_ERROR", msg, 500);
  }
}
