import { describe, it, expect } from "vitest";
import {
  computeEffectivePermissions,
  ROLE_DEFAULTS,
  PERMISSION_KEYS,
  PermissionKey,
} from "../../src/lib/constants/permissions";
import {
  getClaimsSizeBytes,
  CustomClaims,
} from "../../src/lib/constants/claims";
import { ROLES, Role } from "../../src/lib/constants/enums";

describe("Permissions and Custom Claims", () => {
  describe("Effective Permissions", () => {
    it("returns correct default permissions for each role", () => {
      for (const role of ROLES) {
        const perms = computeEffectivePermissions(role);
        expect(perms).toEqual(expect.arrayContaining([...ROLE_DEFAULTS[role]]));
      }
    });

    it("adds valid grants to default permissions", () => {
      const perms = computeEffectivePermissions(
        "receptionist",
        ["reports.view", "slots.manage"],
        []
      );
      expect(perms).toContain("reports.view");
      expect(perms).toContain("slots.manage");
      expect(perms).toContain("patients.search");
    });

    it("ensures denies always win over defaults and grants", () => {
      const perms = computeEffectivePermissions(
        "doctor",
        ["reports.view"],
        ["priority.override", "reports.view"] // Deny an existing default and a granted one
      );
      expect(perms).not.toContain("priority.override");
      expect(perms).not.toContain("reports.view");
      expect(perms).toContain("consultation.manage");
    });

    it("returns zero permissions when active is false (disabled account)", () => {
      const perms = computeEffectivePermissions(
        "admin",
        [],
        [],
        false // disabled
      );
      expect(perms).toEqual([]);
    });
  });

  describe("Custom Claims Size (< 900 bytes limit, W1-06)", () => {
    it("keeps custom claims well below 900 bytes for all roles with default permissions", () => {
      for (const role of ROLES) {
        const perms = computeEffectivePermissions(role);
        const claims: CustomClaims = {
          role,
          perms,
          pv: 1,
        };
        const size = getClaimsSizeBytes(claims);
        expect(size).toBeLessThan(900);
      }
    });

    it("keeps custom claims under 900 bytes even if ALL permission keys are granted to an account", () => {
      const allPerms = [...PERMISSION_KEYS];
      const claims: CustomClaims = {
        role: "admin",
        perms: allPerms,
        pv: 99,
      };
      const size = getClaimsSizeBytes(claims);
      // Admin with all 19 keys should be around 500-600 bytes
      expect(size).toBeLessThan(900);
    });
  });
});
