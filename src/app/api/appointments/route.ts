import { NextRequest } from "next/server";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { authorize } from "@/lib/api/authorize";
import { successResponse, errorResponse } from "@/lib/api/response";
import { bookAppointmentSchema } from "@/lib/schemas/appointment";
import { evaluateRedFlags, computeBase } from "@/lib/priority-engine/engine";
import { DEFAULT_CONFIG_PARAMS } from "@/lib/priority-engine/default-config";
import { PriorityConfigParams } from "@/lib/priority-engine/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authRes = await authorize(req, {
    anyOf: ["appointments.book_self", "appointments.book_for_patient"],
  });
  if (!authRes.success) {
    return authRes.response;
  }

  const callerUid = authRes.context.uid;
  const callerRole = authRes.context.role;
  const isPatient = callerRole === "patient";

  const body = await req.json().catch(() => null);
  const parsed = bookAppointmentSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "VALIDATION_ERROR",
      "Invalid appointment booking data",
      400,
      parsed.error.errors.map((e) => ({
        field: e.path.join("."),
        issue: e.message,
      }))
    );
  }

  const { doctorId, slotId, assessment } = parsed.data;

  // PatientId resolution:
  // For patients: taken strictly from own userDoc.patientId
  // For staff: taken from body.patientId
  let targetPatientId = "";
  if (isPatient) {
    targetPatientId = authRes.context.userDoc.patientId || "";
    if (!targetPatientId) {
      return errorResponse("NO_ROLE", "Patient profile not found for this account", 403);
    }
  } else {
    targetPatientId = parsed.data.patientId || "";
    if (!targetPatientId) {
      return errorResponse("VALIDATION_ERROR", "patientId is required for staff booking", 400);
    }
  }

  // 1. Load active config
  let activeParams: PriorityConfigParams = DEFAULT_CONFIG_PARAMS;
  let activeVersion = 1;
  try {
    const metaSnap = await adminDb.collection("meta").doc("activeConfig").get();
    if (metaSnap.exists) {
      activeVersion = metaSnap.data()?.version || 1;
      const verSnap = await adminDb.collection("configVersions").doc(String(activeVersion)).get();
      if (verSnap.exists) {
        activeParams = verSnap.data()?.params || DEFAULT_CONFIG_PARAMS;
      }
    }
  } catch (err) {
    console.error("Error reading active config:", err);
  }

  // 2. Load doctor and patient
  const [docSnap, patientSnap] = await Promise.all([
    adminDb.collection("doctors").doc(doctorId).get(),
    adminDb.collection("patients").doc(targetPatientId).get(),
  ]);

  if (!docSnap.exists || docSnap.data()?.active === false) {
    return errorResponse("DOCTOR_INACTIVE", "Doctor not found or currently inactive", 409);
  }
  if (!patientSnap.exists) {
    return errorResponse("NOT_FOUND", "Patient record not found", 404);
  }

  const doctorData = docSnap.data()!;
  const patientData = patientSnap.data()!;

  if (patientData.mergedInto) {
    return errorResponse("INVALID_STATE", "This patient profile has been merged into another account", 409);
  }

  // Compute patient age from DOB
  const dobYear = new Date(patientData.dob).getFullYear();
  const currentYear = new Date().getFullYear();
  const patientAge = Math.max(0, currentYear - dobYear);

  // 3. Score calculation with shared priority engine
  const scoreResult = computeBase({ age: patientAge }, assessment, activeParams);

  const newApptRef = adminDb.collection("appointments").doc();
  const slotRef = adminDb.collection("slots").doc(slotId);
  const now = new Date();

  try {
    await adminDb.runTransaction(async (transaction) => {
      // 4. Read and lock slot
      const currentSlotSnap = await transaction.get(slotRef);
      if (!currentSlotSnap.exists) {
        throw new Error("SLOT_NOT_FOUND");
      }

      const currentSlot = currentSlotSnap.data()!;
      if (currentSlot.doctorId !== doctorId) {
        throw new Error("SLOT_MISMATCH");
      }
      if (currentSlot.status !== "AVAILABLE") {
        throw new Error("SLOT_UNAVAILABLE");
      }
      if (currentSlot.startAt.toDate() <= now) {
        throw new Error("SLOT_IN_PAST");
      }

      // 5. Check patient double booking on dateKey
      const dateKey = currentSlot.dateKey;
      const overlapQuery = adminDb
        .collection("appointments")
        .where("patientId", "==", targetPatientId)
        .where("dateKey", "==", dateKey)
        .where("status", "in", ["BOOKED", "CHECKED_IN", "IN_PROGRESS"]);

      const overlapSnap = await transaction.get(overlapQuery);
      const isOverlapping = overlapSnap.docs.some((d) => {
        const a = d.data();
        return a.slotId === slotId;
      });

      if (isOverlapping) {
        throw new Error("PATIENT_DOUBLE_BOOKED");
      }

      // 6. Update Slot
      transaction.update(slotRef, {
        status: "BOOKED",
        appointmentId: newApptRef.id,
      });

      // 7. Write Appointment
      transaction.set(newApptRef, {
        id: newApptRef.id,
        patientId: targetPatientId,
        patientUid: patientData.uid || null,
        patientName: patientData.name,
        patientAge,
        doctorId,
        doctorName: doctorData.name,
        specializationName: doctorData.specializationName,
        slotId,
        dateKey,
        scheduledStartAt: currentSlot.startAt,
        type: isPatient ? "ONLINE" : "RECEPTION",
        bookedByUid: callerUid,
        bookedByRole: callerRole,
        status: "BOOKED",
        bookingTime: FieldValue.serverTimestamp(),
        checkInTime: null,
        startTime: null,
        endTime: null,
        tieBreakAt: FieldValue.serverTimestamp(),
        severityEffective: scoreResult.severityEffective,
        severityPts: scoreResult.severityPts,
        agePts: scoreResult.agePts,
        urgencyPts: scoreResult.urgencyPts,
        baseScore: scoreResult.baseScore,
        emergencyFlag: scoreResult.emergencyFlag,
        manualAdjustment: 0,
        overrideReason: null,
        overriddenByUid: null,
        overriddenAt: null,
        configVersion: activeVersion,
        cancelledAt: null,
        cancelledByUid: null,
        cancelReason: null,
        noShowMarkedAt: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // 8. Write Clinical Assessment Subcollection
      const assessmentRef = newApptRef.collection("clinical").doc("assessment");
      transaction.set(assessmentRef, {
        chiefComplaint: assessment.chiefComplaint,
        symptoms: assessment.symptoms,
        notes: assessment.notes || null,
        severitySelf: assessment.severitySelf,
        onset: assessment.onset,
        durationHours: assessment.durationHours,
        selfUrgent: assessment.selfUrgent,
        redFlags: activeParams.redFlags.filter((rf) => assessment.symptoms.includes(rf)),
        enteredByUid: callerUid,
        enteredByRole: callerRole,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    const emergencyAdvisory = scoreResult.emergencyFlag
      ? "Your answers suggest a possible emergency. Please go to the nearest emergency department or call 112 immediately."
      : undefined;

    // Response shaping: Patients see position & advisory only (no score numbers)
    if (isPatient) {
      return successResponse(
        {
          appointmentId: newApptRef.id,
          status: "BOOKED",
          doctorName: doctorData.name,
          dateKey: doctorData.dateKey,
          emergencyFlag: scoreResult.emergencyFlag,
          emergencyAdvisory,
        },
        201
      );
    }

    // Staff response includes baseScore
    return successResponse(
      {
        appointmentId: newApptRef.id,
        status: "BOOKED",
        doctorName: doctorData.name,
        emergencyFlag: scoreResult.emergencyFlag,
        emergencyAdvisory,
        baseScore: scoreResult.baseScore,
        breakdown: {
          severityPts: scoreResult.severityPts,
          agePts: scoreResult.agePts,
          urgencyPts: scoreResult.urgencyPts,
        },
      },
      201
    );
  } catch (err: any) {
    if (err.message === "SLOT_UNAVAILABLE") {
      return errorResponse("SLOT_UNAVAILABLE", "This slot was just booked by someone else. Please choose another.", 409);
    }
    if (err.message === "SLOT_IN_PAST") {
      return errorResponse("SLOT_IN_PAST", "This slot is in the past.", 409);
    }
    if (err.message === "PATIENT_DOUBLE_BOOKED") {
      return errorResponse("PATIENT_DOUBLE_BOOKED", "Patient already has an appointment scheduled at this time.", 409);
    }
    if (err.message === "SLOT_NOT_FOUND" || err.message === "SLOT_MISMATCH") {
      return errorResponse("NOT_FOUND", "Selected slot is invalid.", 404);
    }
    return errorResponse("INTERNAL_ERROR", err.message || "Failed to book appointment", 500);
  }
}
