import { NextRequest } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { authorize } from "@/lib/api/authorize";
import { successResponse, errorResponse, formatZodDetails } from "@/lib/api/response";
import { todayKey } from "@/lib/time";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sweepSchema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function POST(req: NextRequest) {
  const authRes = await authorize(req, {
    anyOf: ["queue.view_own", "queue.view_all"],
  });
  if (!authRes.success) {
    return authRes.response;
  }

  const callerUid = authRes.context.uid;
  const canViewAll = authRes.context.perms.has("queue.view_all");

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) {
      body = JSON.parse(text);
    }
  } catch {
    return errorResponse("VALIDATION_ERROR", "Invalid JSON payload", 400);
  }

  const parsed = sweepSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Validation failed", 400, formatZodDetails(parsed.error));
  }

  const today = todayKey();
  const dateKey = parsed.data.dateKey || today;

  if (dateKey > today) {
    return errorResponse("VALIDATION_ERROR", "Cannot sweep future dates", 400);
  }

  try {
    // 1. Fetch active config to get noShowGraceMinutes
    let graceMinutes = 20;
    const activeRef = adminDb.collection("meta").doc("activeConfig");
    const activeSnap = await activeRef.get();
    if (activeSnap.exists) {
      const activeVer = activeSnap.data()?.version;
      if (activeVer) {
        const configSnap = await adminDb.collection("configVersions").doc(String(activeVer)).get();
        if (configSnap.exists) {
          const configData = configSnap.data();
          if (configData?.params?.noShowGraceMinutes !== undefined) {
            graceMinutes = configData.params.noShowGraceMinutes;
          }
        }
      }
    }

    // 2. Query BOOKED appointments for dateKey
    let query = adminDb
      .collection("appointments")
      .where("dateKey", "==", dateKey)
      .where("status", "==", "BOOKED");

    if (!canViewAll) {
      query = query.where("doctorId", "==", callerUid);
    }

    const snapshot = await query.get();
    const nowMs = Date.now();
    const graceMs = graceMinutes * 60 * 1000;

    let markedCount = 0;
    const batch = adminDb.batch();

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const scheduledStartAt = data.scheduledStartAt;
      if (scheduledStartAt instanceof Timestamp) {
        const scheduledMs = scheduledStartAt.toMillis();
        if (scheduledMs + graceMs < nowMs) {
          batch.update(docSnap.ref, {
            status: "NO_SHOW",
            noShowMarkedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
          markedCount++;
        }
      }
    });

    if (markedCount > 0) {
      await batch.commit();
    }

    return successResponse({ marked: markedCount });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to sweep appointments";
    return errorResponse("INTERNAL_ERROR", msg, 500);
  }
}
