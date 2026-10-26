import { NextResponse } from "next/server";
import { ZodError } from "zod";

export interface ErrorDetail {
  field?: string;
  issue: string;
}

export function formatZodDetails(error: ZodError): ErrorDetail[] {
  return error.errors.map((e) => ({
    field: e.path.join("."),
    issue: e.message,
  }));
}

export function successResponse<T>(data: T, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json({ data }, { status, headers });
}

export function errorResponse(
  code: string,
  message: string,
  status = 400,
  details: ErrorDetail[] = [],
  headers: Record<string, string> = {}
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details,
      },
    },
    { status, headers }
  );
}
