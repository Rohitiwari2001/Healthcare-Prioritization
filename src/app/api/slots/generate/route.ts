import { NextRequest } from "next/server";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { authorize } from "@/lib/api/authorize";
import { successResponse, errorResponse } from "@/lib/api/response";
import { generateSlotsSchema } from "@/lib/schemas/slots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatMinutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Convert clinic dateKey + HH:mm in Asia/Kolkata (+05:30) to UTC Date
function kolkataToUtc(dateKey: string, timeStr: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  // Asia/Kolkata is UTC + 5:30 (330 minutes)
  const utcMillis = Date.UTC(year, month - 1, day, hour, minute) - 330 * 60 * 1000;
  return new Date(utcMillis);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = generateSlotsSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "VALIDATION_ERROR",
      "Invalid slot generation parameters",
      400,
      parsed.error.errors.map((e) => ({
        field: e.path.join("."),
        issue: e.message,
      }))
    );
  }

  const { doctorId, dateFrom, dateTo, blocks, slotMinutes } = parsed.data;

  // Authorize: slots.manage or slots.manage_own
  const authRes = await authorize(req, { anyOf: ["slots.manage", "slots.manage_own"] });
  if (!authRes.success) {
    return authRes.response;
  }

  const callerUid = authRes.context.uid;
  const isSelf = callerUid === doctorId;
  const hasGlobalManage = authRes.context.perms.has("slots.manage");

  if (!hasGlobalManage && !isSelf) {
    return errorResponse("FORBIDDEN", "You can only generate slots for your own account", 403);
  }

  // Doctor must exist and be active
  const docSnap = await adminDb.collection("doctors").doc(doctorId).get();
  if (!docSnap.exists || docSnap.data()?.active === false) {
    return errorResponse("DOCTOR_INACTIVE", "Doctor not found or inactive", 409);
  }

  const [sy, sm, sd] = dateFrom.split("-").map(Number);
  const [ey, em, ed] = dateTo.split("-").map(Number);
  const startDate = new Date(Date.UTC(sy, sm - 1, sd, 12, 0, 0));
  const endDate = new Date(Date.UTC(ey, em - 1, ed, 12, 0, 0));
  const dayDiff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
  if (dayDiff < 0 || dayDiff > 31) {
    return errorResponse("VALIDATION_ERROR", "Date range must be between 0 and 31 days", 400);
  }

  const now = new Date();
  let created = 0;
  let skippedExisting = 0;
  let skippedPast = 0;

  // Process day by day using UTC math
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const year = currentDate.getUTCFullYear();
    const month = String(currentDate.getUTCMonth() + 1).padStart(2, "0");
    const day = String(currentDate.getUTCDate()).padStart(2, "0");
    const dateKey = `${year}-${month}-${day}`;

    for (const block of blocks) {
      const blockStartMin = parseTimeToMinutes(block.start);
      const blockEndMin = parseTimeToMinutes(block.end);

      for (let cur = blockStartMin; cur + slotMinutes <= blockEndMin; cur += slotMinutes) {
        const startTime = formatMinutesToTime(cur);
        const endTime = formatMinutesToTime(cur + slotMinutes);
        const hhmm = startTime.replace(":", "");
        const slotId = `${doctorId}_${dateKey}_${hhmm}`;

        const startAt = kolkataToUtc(dateKey, startTime);
        const endAt = kolkataToUtc(dateKey, endTime);

        if (startAt <= now) {
          skippedPast++;
          continue;
        }

        const slotRef = adminDb.collection("slots").doc(slotId);
        const existing = await slotRef.get();
        if (existing.exists) {
          skippedExisting++;
          continue;
        }

        await slotRef.set({
          doctorId,
          dateKey,
          startTime,
          endTime,
          startAt: Timestamp.fromDate(startAt),
          endAt: Timestamp.fromDate(endAt),
          status: "AVAILABLE",
          appointmentId: null,
          createdByUid: callerUid,
          createdAt: FieldValue.serverTimestamp(),
        });

        created++;
      }
    }

    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  return successResponse({
    created,
    createdCount: created,
    skippedExisting,
    skippedPast,
  }, 201);
}
