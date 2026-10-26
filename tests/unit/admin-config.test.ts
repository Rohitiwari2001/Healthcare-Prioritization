import { describe, it, expect } from "vitest";
import { validateConfigParams } from "@/lib/schemas/admin";
import { DEFAULT_CONFIG_PARAMS } from "@/lib/priority-engine/default-config";

describe("Scoring Config Validation (DOC_4 G1 / DOC_3 Section 7.10)", () => {
  it("validates the default config successfully", () => {
    const error = validateConfigParams(DEFAULT_CONFIG_PARAMS);
    expect(error).toBeNull();
  });

  it("fails if severity points are not strictly increasing", () => {
    const invalidParams = JSON.parse(JSON.stringify(DEFAULT_CONFIG_PARAMS));
    invalidParams.severityPoints.SEVERE = 25; // less than MODERATE (30)

    const error = validateConfigParams(invalidParams);
    expect(error).toContain("Severity points must be strictly increasing");
  });

  it("fails if age points do not start at 0", () => {
    const invalidParams = JSON.parse(JSON.stringify(DEFAULT_CONFIG_PARAMS));
    invalidParams.agePoints[0].min = 1; // gap at 0

    const error = validateConfigParams(invalidParams);
    expect(error).toContain("Age points must start at min 0");
  });

  it("fails if age points do not end at 150", () => {
    const invalidParams = JSON.parse(JSON.stringify(DEFAULT_CONFIG_PARAMS));
    invalidParams.agePoints[invalidParams.agePoints.length - 1].max = 100;

    const error = validateConfigParams(invalidParams);
    expect(error).toContain("Age points must end at max 150");
  });

  it("fails if age brackets have gaps or overlaps", () => {
    const invalidParams = JSON.parse(JSON.stringify(DEFAULT_CONFIG_PARAMS));
    // change band 1 max from 5 to 7 without updating next band min (6)
    invalidParams.agePoints[1].max = 7;

    const error = validateConfigParams(invalidParams);
    expect(error).toContain("Age brackets have gap or overlap");
  });
});
