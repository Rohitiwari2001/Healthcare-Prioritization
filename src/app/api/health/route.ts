import { successResponse } from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return successResponse({
    status: "ok",
    time: new Date().toISOString(),
  });
}
