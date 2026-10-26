import { Role } from "./enums";
import { PermissionKey } from "./permissions";

export interface CustomClaims {
  role: Role;
  perms: PermissionKey[];
  pv: number;
}

export function serializeClaims(claims: CustomClaims): string {
  return JSON.stringify(claims);
}

export function getClaimsSizeBytes(claims: CustomClaims): number {
  return new TextEncoder().encode(serializeClaims(claims)).length;
}
