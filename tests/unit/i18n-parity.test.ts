import { describe, it, expect } from "vitest";
import en from "../../src/locales/en.json";
import hi from "../../src/locales/hi.json";

function getDeepKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  let keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      keys = keys.concat(getDeepKeys(v as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

describe("i18n Key Parity (English and Hindi)", () => {
  it("en.json and hi.json must have the exact same set of translation keys", () => {
    const enKeys = getDeepKeys(en);
    const hiKeys = getDeepKeys(hi);

    const missingInHindi = enKeys.filter((k) => !hiKeys.includes(k));
    const extraInHindi = hiKeys.filter((k) => !enKeys.includes(k));

    expect(missingInHindi).toEqual([]);
    expect(extraInHindi).toEqual([]);
    expect(enKeys).toEqual(hiKeys);
  });
});
