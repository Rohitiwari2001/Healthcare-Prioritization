import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { authorize } from "@/lib/api/authorize";
import { successResponse, errorResponse } from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: appointmentId } = await params;

  const authRes = await authorize(req, {
    anyOf: ["consultation.manage"],
  });
  if (!authRes.success) {
    return authRes.response;
  }

  const callerUid = authRes.context.uid;
  const apptRef = adminDb.collection("appointments").doc(appointmentId);

  try {
    const result = await adminDb.runTransaction(async (transaction) => {
      const apptDoc = await transaction.get(apptRef);
      if (!apptDoc.exists) {
        throw new Error("NOT_FOUND");
      }

      const appt = apptDoc.data()!;

      // Must be the assigned doctor
      if (appt.doctorId !== callerUid) {
        throw new Error("FORBIDDEN");
      }

      // Must be CHECKED_IN
      if (appt.status !== "CHECKED_IN") {
        throw new Error("INVALID_STATE");
      }

      // Check if doctor already has an IN_PROGRESS appointment
      const activeQuery = adminDb
        .collection("appointments")
        .where("doctorId", "==", callerUid)
        .where("status", "==", "IN_PROGRESS")
        .limit(1);

      const activeSnap = await transaction.get(activeQuery);
      if (!activeSnap.empty) {
        throw new Error("DOCTOR_BUSY");
      }

      const nowTimestamp = FieldValue.serverTimestamp();
      transaction.update(apptRef, {
        status: "IN_PROGRESS",
        startTime: nowTimestamp,
        updatedAt: nowTimestamp,
      });

      return { status: "IN_PROGRESS" };
    });

    return successResponse({
      status: result.status,
      startTime: new Date().toISOString(),
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === "NOT_FOUND") {
        return errorResponse("NOT_FOUND", "Appointment not found", 404);
      }
      if (err.message === "FORBIDDEN") {
        return errorResponse("FORBIDDEN", "Only the assigned doctor can start this consultation", 403);
      }
      if (err.message === "INVALID_STATE") {
        return errorResponse("INVALID_STATE", "Only checked-in appointments can be started", 409);
      }
      if (err.message === "DOCTOR_BUSY") {
        return errorResponse("DOCTOR_BUSY", "You already have a consultation in progress. Please complete it first.", 409);
      }
    }
    const msg = err instanceof Error ? err.message : "Failed to start consultation";
    return errorResponse("INTERNAL_ERROR", msg, 500);
  }
}
