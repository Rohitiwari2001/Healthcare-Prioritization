import "server-only";
import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "../firebase/admin";
import { PermissionKey } from "../constants/permissions";
import { Role } from "../constants/enums";
import { errorResponse } from "./response";

export interface UserDoc {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  grants: string[];
  denies: string[];
  effectivePerms: PermissionKey[];
  active: boolean;
  mustChangePassword?: boolean;
  permVersion: number;
  patientId?: string | null;
  [key: string]: unknown;
}

export interface AuthContext {
  uid: string;
  role: Role;
  perms: Set<PermissionKey>;
  userDoc: UserDoc;
  staleToken: boolean;
  headers: Record<string, string>;
}

export interface AuthorizeOptions {
  anyOf?: PermissionKey[];
  allowRoleless?: boolean; // for complete-patient-profile
  allowPasswordChange?: boolean; // for change-initial-password
}

export type AuthorizeResult =
  | { success: true; context: AuthContext }
  | { success: false; response: ReturnType<typeof errorResponse> };

export async function authorize(
  req: NextRequest,
  options: AuthorizeOptions = {}
): Promise<AuthorizeResult> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      success: false,
      response: errorResponse("UNAUTHENTICATED", "Missing or malformed Authorization header", 401),
    };
  }

  const tokenString = authHeader.substring(7).trim();

  let decodedToken;
  try {
    // Verify ID token with revocation check
    decodedToken = await adminAuth.verifyIdToken(tokenString, true);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Token verification failed";
    return {
      success: false,
      response: errorResponse("UNAUTHENTICATED", `Invalid, expired or revoked token: ${message}`, 401),
    };
  }

  const uid = decodedToken.uid;

  // Roleless endpoint (A1: complete-patient-profile)
  if (options.allowRoleless) {
    return {
      success: true,
      context: {
        uid,
        role: "patient" as Role,
        perms: new Set(),
        userDoc: {
          uid,
          email: decodedToken.email || "",
          displayName: "",
          role: "patient",
          grants: [],
          denies: [],
          effectivePerms: [],
          active: true,
          permVersion: 1,
        },
        staleToken: false,
        headers: {},
      },
    };
  }

  // Read users/{uid} document as source of truth
  const userSnap = await adminDb.collection("users").doc(uid).get();
  if (!userSnap.exists) {
    return {
      success: false,
      response: errorResponse("NO_ROLE", "User profile document does not exist", 403),
    };
  }

  const userDoc = userSnap.data() as UserDoc;

  if (!userDoc.role) {
    return {
      success: false,
      response: errorResponse("NO_ROLE", "User has no assigned role", 403),
    };
  }

  if (userDoc.active === false) {
    return {
      success: false,
      response: errorResponse("ACCOUNT_DISABLED", "Account has been disabled by administrator", 403),
    };
  }

  // Force password change check
  if (userDoc.mustChangePassword && !options.allowPasswordChange) {
    return {
      success: false,
      response: errorResponse(
        "PASSWORD_CHANGE_REQUIRED",
        "Must change initial password before proceeding",
        403
      ),
    };
  }

  // Effective permissions
  const effectivePerms = new Set<PermissionKey>(userDoc.effectivePerms || []);

  if (options.anyOf && options.anyOf.length > 0) {
    const hasPermission = options.anyOf.some((p) => effectivePerms.has(p));
    if (!hasPermission) {
      return {
        success: false,
        response: errorResponse("FORBIDDEN", "Insufficient permissions for this operation", 403),
      };
    }
  }

  // Check for stale claims token
  const tokenPv = (decodedToken.pv as number) || 0;
  const staleToken = tokenPv !== userDoc.permVersion;
  const headers: Record<string, string> = {};
  if (staleToken) {
    headers["X-Permissions-Stale"] = "true";
  }

  return {
    success: true,
    context: {
      uid,
      role: userDoc.role,
      perms: effectivePerms,
      userDoc,
      staleToken,
      headers,
    },
  };
}
