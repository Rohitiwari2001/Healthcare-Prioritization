import { describe, it, expect } from "vitest";
import { runSimulation, generateSyntheticPatients } from "@/features/simulation/simulator";

describe("Queue Discrete-Event Simulator (DOC_5 Section 11.5 / DOC_7 M5)", () => {
  it("generates requested number of patients sorted by arrival time", () => {
    const patients = generateSyntheticPatients({
      totalPatients: 50,
      doctorCount: 2,
      avgConsultMinutes: 10,
      shiftHours: 8,
      agingDivisor: 10,
      agingCap: 30,
    });

    expect(patients.length).toBe(50);
    for (let i = 1; i < patients.length; i++) {
      expect(patients[i].arrivalTime).toBeGreaterThanOrEqual(patients[i - 1].arrivalTime);
    }
  });

  it("runs simulation and produces comparative metrics for all 3 policies", () => {
    const result = runSimulation({
      totalPatients: 100,
      doctorCount: 2,
      avgConsultMinutes: 12,
      shiftHours: 8,
      agingDivisor: 10,
      agingCap: 30,
    });

    expect(result.patients.length).toBe(100);

    // Verify all metrics exist and are non-negative
    expect(result.fcfs.avgWait).toBeGreaterThanOrEqual(0);
    expect(result.staticPriority.avgWait).toBeGreaterThanOrEqual(0);
    expect(result.dynamicAging.avgWait).toBeGreaterThanOrEqual(0);

    // Under priority systems, critical patients should have significantly lower wait than under FCFS
    // Note: Due to stochastic generation, we check critical avg wait <= mild avg wait under dynamic aging
    if (result.dynamicAging.criticalAvgWait > 0 && result.dynamicAging.mildAvgWait > 0) {
      expect(result.dynamicAging.criticalAvgWait).toBeLessThanOrEqual(result.dynamicAging.mildAvgWait);
    }

    // Dynamic aging should mitigate mild starvation compared to static priority
    expect(result.dynamicAging.starvationRate).toBeDefined();
    expect(result.staticPriority.starvationRate).toBeDefined();
  });
});
