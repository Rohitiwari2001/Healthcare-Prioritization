import { auth } from "../firebase/client";

export class ApiError extends Error {
  code: string;
  status: number;
  details?: Array<{ field?: string; issue: string }>;

  constructor(
    code: string,
    status: number,
    details?: Array<{ field?: string; issue: string }>
  ) {
    super(`API Error ${code} (${status})`);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {}
): Promise<T> {
  const user = auth.currentUser;
  if (!user) {
    throw new ApiError("UNAUTHENTICATED", 401);
  }

  // Refreshed automatically when expired
  const token = await user.getIdToken();

  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${token}`);

  const normalizedPath = path.startsWith("/api") ? path : `/api${path}`;

  let requestBody = init.body;
  if (init.json !== undefined) {
    requestBody = JSON.stringify(init.json);
  }

  const res = await fetch(normalizedPath, {
    ...init,
    headers,
    body: requestBody,
  });

  // Check if server signaled permissions changed
  if (res.headers.get("X-Permissions-Stale") === "true") {
    void user.getIdToken(true);
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      body?.error?.code ?? "INTERNAL_ERROR",
      res.status,
      body?.error?.details
    );
  }

  return body.data as T;
}
