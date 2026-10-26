import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { authorize } from "@/lib/api/authorize";
import { successResponse, errorResponse } from "@/lib/api/response";
import { toggleBlockSlotSchema } from "@/lib/schemas/slots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slotId: string }> }
) {
  const { slotId } = await params;

  const authRes = await authorize(req, { anyOf: ["slots.manage", "slots.manage_own"] });
  if (!authRes.success) {
    return authRes.response;
  }

  const slotRef = adminDb.collection("slots").doc(slotId);
  const slotSnap = await slotRef.get();
  if (!slotSnap.exists) {
    return errorResponse("NOT_FOUND", "Slot not found", 404);
  }

  const slotData = slotSnap.data()!;
  const callerUid = authRes.context.uid;
  const isSelf = callerUid === slotData.doctorId;
  const hasGlobalManage = authRes.context.perms.has("slots.manage");

  if (!hasGlobalManage && !isSelf) {
    return errorResponse("FORBIDDEN", "You can only manage your own slots", 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = toggleBlockSlotSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid body", 400);
  }

  const { blocked } = parsed.data;

  if (blocked) {
    if (slotData.status === "BOOKED") {
      return errorResponse("SLOT_BOOKED", "Cannot block a slot that has already been booked", 409);
    }
    await slotRef.update({ status: "BLOCKED" });
    return successResponse({ status: "BLOCKED" });
  } else {
    if (slotData.status !== "BLOCKED") {
      return errorResponse("INVALID_STATE", "Only BLOCKED slots can be unblocked", 409);
    }
    await slotRef.update({ status: "AVAILABLE" });
    return successResponse({ status: "AVAILABLE" });
  }
}
