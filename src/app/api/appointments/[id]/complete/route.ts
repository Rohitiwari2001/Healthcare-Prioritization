import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { authorize } from "@/lib/api/authorize";
import { successResponse, errorResponse, formatZodDetails } from "@/lib/api/response";
import { completeConsultationSchema } from "@/lib/schemas/appointment";

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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("VALIDATION_ERROR", "Invalid JSON payload", 400);
  }

  const parsed = completeConsultationSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Validation failed", 400, formatZodDetails(parsed.error));
  }

  const { notes, prescription } = parsed.data;
  const apptRef = adminDb.collection("appointments").doc(appointmentId);
  const consultationRef = apptRef.collection("clinical").doc("consultation");

  try {
    await adminDb.runTransaction(async (transaction) => {
      const apptDoc = await transaction.get(apptRef);
      if (!apptDoc.exists) {
        throw new Error("NOT_FOUND");
      }

      const appt = apptDoc.data()!;

      // Must be the assigned doctor
      if (appt.doctorId !== callerUid) {
        throw new Error("FORBIDDEN");
      }

      // Must be IN_PROGRESS
      if (appt.status !== "IN_PROGRESS") {
        throw new Error("INVALID_STATE");
      }

      const nowTimestamp = FieldValue.serverTimestamp();

      transaction.update(apptRef, {
        status: "COMPLETED",
        endTime: nowTimestamp,
        updatedAt: nowTimestamp,
      });

      transaction.set(consultationRef, {
        notes,
        prescription: prescription || "",
        doctorUid: callerUid,
        completedAt: nowTimestamp,
      });
    });

    return successResponse({
      status: "COMPLETED",
      endTime: new Date().toISOString(),
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === "NOT_FOUND") {
        return errorResponse("NOT_FOUND", "Appointment not found", 404);
      }
      if (err.message === "FORBIDDEN") {
        return errorResponse("FORBIDDEN", "Only the assigned doctor can complete this consultation", 403);
      }
      if (err.message === "INVALID_STATE") {
        return errorResponse("INVALID_STATE", "Only in-progress appointments can be completed", 409);
      }
    }
    const msg = err instanceof Error ? err.message : "Failed to complete consultation";
    return errorResponse("INTERNAL_ERROR", msg, 500);
  }
}
