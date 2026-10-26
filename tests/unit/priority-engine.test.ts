import { describe, it, expect } from "vitest";
import {
  computeBase,
  computeAging,
  computeFinal,
  sortQueue,
  getAgePoints,
  DEFAULT_CONFIG_PARAMS,
  PatientAssessmentInput,
  QueueItem,
} from "../../src/lib/priority-engine";

describe("Priority Engine", () => {
  describe("Age Bands and Boundaries", () => {
    it("assigns correct points across all age bands and exact boundaries", () => {
      // Below 1 year (< 1): 25 pts
      expect(getAgePoints(0, DEFAULT_CONFIG_PARAMS)).toBe(25);
      expect(getAgePoints(0.5, DEFAULT_CONFIG_PARAMS)).toBe(25);

      // 1 to 5 years: 20 pts
      expect(getAgePoints(1, DEFAULT_CONFIG_PARAMS)).toBe(20);
      expect(getAgePoints(5, DEFAULT_CONFIG_PARAMS)).toBe(20);

      // 6 to 17 years: 5 pts
      expect(getAgePoints(6, DEFAULT_CONFIG_PARAMS)).toBe(5);
      expect(getAgePoints(17, DEFAULT_CONFIG_PARAMS)).toBe(5);

      // 18 to 59 years: 0 pts
      expect(getAgePoints(18, DEFAULT_CONFIG_PARAMS)).toBe(0);
      expect(getAgePoints(59, DEFAULT_CONFIG_PARAMS)).toBe(0);

      // 60 to 74 years: 15 pts
      expect(getAgePoints(60, DEFAULT_CONFIG_PARAMS)).toBe(15);
      expect(getAgePoints(74, DEFAULT_CONFIG_PARAMS)).toBe(15);

      // 75 years and above: 25 pts
      expect(getAgePoints(75, DEFAULT_CONFIG_PARAMS)).toBe(25);
      expect(getAgePoints(90, DEFAULT_CONFIG_PARAMS)).toBe(25);
    });
  });

  describe("Six Worked Examples (Section 11.4 of Master Document)", () => {
    it("Example 1: 72y, severe complaint, sudden, under 24h, 40m wait -> Base 90, Aging 4, Final 94", () => {
      const assessment: PatientAssessmentInput = {
        chiefComplaint: "COUGH",
        symptoms: ["COUGH"],
        severitySelf: "SEVERE",
        onset: "SUDDEN",
        durationHours: 10,
        selfUrgent: false,
      };
      const result = computeBase({ age: 72 }, assessment, DEFAULT_CONFIG_PARAMS);
      expect(result.severityPts).toBe(60);
      expect(result.agePts).toBe(15);
      expect(result.urgencyPts).toBe(15); // sudden (+10) + <24h (+5)
      expect(result.baseScore).toBe(90);
      expect(result.emergencyFlag).toBe(false);

      const checkInTime = new Date("2026-11-05T10:00:00Z");
      const now = new Date("2026-11-05T10:40:00Z");
      const aging = computeAging(checkInTime, now, DEFAULT_CONFIG_PARAMS);
      expect(aging).toBe(4);

      const finalScore = computeFinal({ baseScore: result.baseScore, checkInTime }, now, DEFAULT_CONFIG_PARAMS);
      expect(finalScore).toBe(94);
    });

    it("Example 2: 25y, mild fever, under 24h, 120m wait -> Base 15, Aging 12, Final 27", () => {
      const assessment: PatientAssessmentInput = {
        chiefComplaint: "FEVER",
        symptoms: ["FEVER"],
        severitySelf: "MILD",
        onset: "GRADUAL",
        durationHours: 12,
        selfUrgent: false,
      };
      const result = computeBase({ age: 25 }, assessment, DEFAULT_CONFIG_PARAMS);
      expect(result.severityPts).toBe(10);
      expect(result.agePts).toBe(0);
      expect(result.urgencyPts).toBe(5); // <24h (+5)
      expect(result.baseScore).toBe(15);
      expect(result.emergencyFlag).toBe(false);

      const checkInTime = new Date("2026-11-05T10:00:00Z");
      const now = new Date("2026-11-05T12:00:00Z");
      const aging = computeAging(checkInTime, now, DEFAULT_CONFIG_PARAMS);
      expect(aging).toBe(12);

      const finalScore = computeFinal({ baseScore: result.baseScore, checkInTime }, now, DEFAULT_CONFIG_PARAMS);
      expect(finalScore).toBe(27);
    });

    it("Example 3: 3y child, moderate, sudden, under 24h, self-urgent -> Base 75, Aging 0, Final 75", () => {
      const assessment: PatientAssessmentInput = {
        chiefComplaint: "FEVER",
        symptoms: ["FEVER"],
        severitySelf: "MODERATE",
        onset: "SUDDEN",
        durationHours: 6,
        selfUrgent: true,
      };
      const result = computeBase({ age: 3 }, assessment, DEFAULT_CONFIG_PARAMS);
      expect(result.severityPts).toBe(30);
      expect(result.agePts).toBe(20);
      expect(result.urgencyPts).toBe(25); // sudden (+10) + <24h (+5) + selfUrgent (+10)
      expect(result.baseScore).toBe(75);
      expect(result.emergencyFlag).toBe(false);

      const checkInTime = new Date("2026-11-05T10:00:00Z");
      const now = new Date("2026-11-05T10:00:00Z");
      const finalScore = computeFinal({ baseScore: result.baseScore, checkInTime }, now, DEFAULT_CONFIG_PARAMS);
      expect(finalScore).toBe(75);
    });

    it("Example 4: 55y, chest pain (red flag), sudden, under 24h -> Base 115, emergencyFlag=true, Final 115", () => {
      const assessment: PatientAssessmentInput = {
        chiefComplaint: "CHEST_PAIN",
        symptoms: ["CHEST_PAIN"],
        severitySelf: "MILD", // Even if self-reported mild, red flag forces CRITICAL
        onset: "SUDDEN",
        durationHours: 2,
        selfUrgent: false,
      };
      const result = computeBase({ age: 55 }, assessment, DEFAULT_CONFIG_PARAMS);
      expect(result.severityEffective).toBe("CRITICAL");
      expect(result.severityPts).toBe(100);
      expect(result.agePts).toBe(0);
      expect(result.urgencyPts).toBe(15); // sudden (+10) + <24h (+5)
      expect(result.baseScore).toBe(115);
      expect(result.emergencyFlag).toBe(true);
    });

    it("Example 5: 25y, mild, waiting 300m -> Base 15, Aging capped at +30, Final 45", () => {
      const assessment: PatientAssessmentInput = {
        chiefComplaint: "OTHER",
        symptoms: ["OTHER"],
        severitySelf: "MILD",
        onset: "GRADUAL",
        durationHours: 5,
        selfUrgent: false,
      };
      const result = computeBase({ age: 25 }, assessment, DEFAULT_CONFIG_PARAMS);
      expect(result.baseScore).toBe(15);

      const checkInTime = new Date("2026-11-05T08:00:00Z");
      const now = new Date("2026-11-05T13:00:00Z"); // 300 min wait
      const aging = computeAging(checkInTime, now, DEFAULT_CONFIG_PARAMS);
      expect(aging).toBe(30); // 300 / 10 = 30 = cap

      const finalScore = computeFinal({ baseScore: result.baseScore, checkInTime }, now, DEFAULT_CONFIG_PARAMS);
      expect(finalScore).toBe(45);
    });

    it("Example 6: 40y, moderate, just arrived, gradual, over 24h -> Base 30, Aging 0, Final 30", () => {
      const assessment: PatientAssessmentInput = {
        chiefComplaint: "STOMACH_PAIN",
        symptoms: ["STOMACH_PAIN"],
        severitySelf: "MODERATE",
        onset: "GRADUAL",
        durationHours: 48,
        selfUrgent: false,
      };
      const result = computeBase({ age: 40 }, assessment, DEFAULT_CONFIG_PARAMS);
      expect(result.severityPts).toBe(30);
      expect(result.agePts).toBe(0);
      expect(result.urgencyPts).toBe(0);
      expect(result.baseScore).toBe(30);

      const checkInTime = new Date("2026-11-05T10:00:00Z");
      const now = new Date("2026-11-05T10:00:00Z");
      const finalScore = computeFinal({ baseScore: result.baseScore, checkInTime }, now, DEFAULT_CONFIG_PARAMS);
      expect(finalScore).toBe(30);
    });

    it("Demonstrates aging: long-waiting mild patient (45) overtakes newly arrived moderate patient (30)", () => {
      const now = new Date("2026-11-05T13:00:00Z");

      const patient5: QueueItem = {
        id: "p5",
        baseScore: 15,
        checkInTime: new Date("2026-11-05T08:00:00Z"), // 300 min wait -> aging 30 -> final 45
        tieBreakAt: new Date("2026-11-05T08:00:00Z"),
        status: "CHECKED_IN",
      };

      const patient6: QueueItem = {
        id: "p6",
        baseScore: 30,
        checkInTime: new Date("2026-11-05T13:00:00Z"), // 0 min wait -> aging 0 -> final 30
        tieBreakAt: new Date("2026-11-05T13:00:00Z"),
        status: "CHECKED_IN",
      };

      const sorted = sortQueue([patient6, patient5], now, DEFAULT_CONFIG_PARAMS);
      expect(sorted[0].id).toBe("p5");
      expect(sorted[0].finalScore).toBe(45);
      expect(sorted[1].id).toBe("p6");
      expect(sorted[1].finalScore).toBe(30);
    });
  });

  describe("Queue Sorting Rules", () => {
    it("pins IN_PROGRESS patient first, regardless of other scores", () => {
      const now = new Date("2026-11-05T10:30:00Z");

      const appt1: QueueItem = {
        id: "a1_in_progress",
        baseScore: 20,
        checkInTime: new Date("2026-11-05T10:00:00Z"),
        tieBreakAt: new Date("2026-11-05T09:00:00Z"),
        status: "IN_PROGRESS",
      };

      const appt2: QueueItem = {
        id: "a2_critical",
        baseScore: 115,
        checkInTime: new Date("2026-11-05T10:20:00Z"),
        tieBreakAt: new Date("2026-11-05T10:20:00Z"),
        status: "CHECKED_IN",
      };

      const sorted = sortQueue([appt2, appt1], now, DEFAULT_CONFIG_PARAMS);
      expect(sorted[0].id).toBe("a1_in_progress");
      expect(sorted[1].id).toBe("a2_critical");
    });

    it("breaks ties using earlier tieBreakAt", () => {
      const now = new Date("2026-11-05T10:30:00Z");

      const apptA: QueueItem = {
        id: "a_earlier",
        baseScore: 50,
        checkInTime: new Date("2026-11-05T10:00:00Z"),
        tieBreakAt: new Date("2026-11-05T09:15:00Z"),
        status: "CHECKED_IN",
      };

      const apptB: QueueItem = {
        id: "b_later",
        baseScore: 50,
        checkInTime: new Date("2026-11-05T10:00:00Z"),
        tieBreakAt: new Date("2026-11-05T09:45:00Z"),
        status: "CHECKED_IN",
      };

      const sorted = sortQueue([apptB, apptA], now, DEFAULT_CONFIG_PARAMS);
      expect(sorted[0].id).toBe("a_earlier");
      expect(sorted[1].id).toBe("b_later");
    });
  });
});
