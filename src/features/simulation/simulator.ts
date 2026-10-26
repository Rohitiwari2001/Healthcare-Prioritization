import { DEFAULT_CONFIG_PARAMS } from "@/lib/priority-engine/default-config";
import { computeBase, computeAging } from "@/lib/priority-engine";
import { Severity } from "@/lib/constants/enums";

export interface SimulationParams {
  totalPatients: number;
  doctorCount: number;
  avgConsultMinutes: number;
  shiftHours: number;
  agingDivisor: number;
  agingCap: number;
}

export interface SimulatedPatient {
  id: string;
  arrivalTime: number; // minute of the day (0 to shiftHours * 60)
  severity: Severity;
  age: number;
  baseScore: number;
  consultDuration: number;
  // Results under policies:
  fcfsStartTime?: number;
  fcfsWait?: number;
  staticStartTime?: number;
  staticWait?: number;
  dynamicStartTime?: number;
  dynamicWait?: number;
}

export interface PolicyMetrics {
  avgWait: number;
  maxWait: number;
  criticalAvgWait: number;
  severeAvgWait: number;
  moderateAvgWait: number;
  mildAvgWait: number;
  starvationRate: number; // % of mild patients waiting > 60 mins
}

export interface SimulationResult {
  patients: SimulatedPatient[];
  fcfs: PolicyMetrics;
  staticPriority: PolicyMetrics;
  dynamicAging: PolicyMetrics;
}

/**
 * Generate synthetic patients arriving over the clinic shift.
 */
export function generateSyntheticPatients(params: SimulationParams): SimulatedPatient[] {
  const shiftMinutes = params.shiftHours * 60;
  const patients: SimulatedPatient[] = [];

  for (let i = 0; i < params.totalPatients; i++) {
    // Arrival time uniformly / poisson distributed across shift
    const arrivalTime = Math.floor(Math.random() * (shiftMinutes - 60));

    // Severity distribution: 50% Mild, 30% Moderate, 15% Severe, 5% Critical
    const randSev = Math.random();
    let severity: Severity = "MILD";
    if (randSev > 0.95) severity = "CRITICAL";
    else if (randSev > 0.80) severity = "SEVERE";
    else if (randSev > 0.50) severity = "MODERATE";

    // Age distribution: 10% infants/child (<10), 60% adults (18-59), 30% elderly (60+)
    const randAge = Math.random();
    let age = 35;
    if (randAge < 0.10) age = Math.floor(Math.random() * 8) + 1;
    else if (randAge > 0.70) age = Math.floor(Math.random() * 25) + 60;
    else age = Math.floor(Math.random() * 40) + 18;

    // Consult duration: normal variation around average (e.g. 8 to 20 mins)
    const consultDuration = Math.max(
      5,
      Math.round(params.avgConsultMinutes + (Math.random() * 8 - 4))
    );

    // Compute base priority score using shared engine
    const base = computeBase(
      { age },
      {
        chiefComplaint: "FEVER",
        symptoms: severity === "CRITICAL" ? ["CHEST_PAIN"] : ["FEVER"],
        severitySelf: severity,
        onset: "GRADUAL",
        durationHours: 24,
        selfUrgent: false,
      },
      DEFAULT_CONFIG_PARAMS
    );

    patients.push({
      id: `SIM-${i + 1}`,
      arrivalTime,
      severity,
      age,
      baseScore: base.baseScore,
      consultDuration,
    });
  }

  // Sort by arrival time
  patients.sort((a, b) => a.arrivalTime - b.arrivalTime);
  return patients;
}

function calculateMetrics(
  patients: SimulatedPatient[],
  waitProp: "fcfsWait" | "staticWait" | "dynamicWait"
): PolicyMetrics {
  let totalWait = 0;
  let maxWait = 0;

  const waitBySev: Record<Severity, { total: number; count: number }> = {
    CRITICAL: { total: 0, count: 0 },
    SEVERE: { total: 0, count: 0 },
    MODERATE: { total: 0, count: 0 },
    MILD: { total: 0, count: 0 },
  };

  let mildStarved = 0;

  for (const p of patients) {
    const w = p[waitProp] ?? 0;
    totalWait += w;
    if (w > maxWait) maxWait = w;

    waitBySev[p.severity].total += w;
    waitBySev[p.severity].count++;

    if (p.severity === "MILD" && w > 60) {
      mildStarved++;
    }
  }

  const mildCount = waitBySev.MILD.count || 1;

  return {
    avgWait: Math.round(totalWait / patients.length),
    maxWait: Math.round(maxWait),
    criticalAvgWait: Math.round((waitBySev.CRITICAL.total / (waitBySev.CRITICAL.count || 1))),
    severeAvgWait: Math.round((waitBySev.SEVERE.total / (waitBySev.SEVERE.count || 1))),
    moderateAvgWait: Math.round((waitBySev.MODERATE.total / (waitBySev.MODERATE.count || 1))),
    mildAvgWait: Math.round((waitBySev.MILD.total / mildCount)),
    starvationRate: Math.round((mildStarved / mildCount) * 100),
  };
}

/**
 * Runs discrete-event simulation across FCFS, Static Priority, and Dynamic Aging.
 */
export function runSimulation(params: SimulationParams): SimulationResult {
  const patients = generateSyntheticPatients(params);

  // 1. Simulate FCFS Policy
  {
    const doctorFreeAt = new Array(params.doctorCount).fill(0);
    for (const p of patients) {
      // Find earliest available doctor
      let earliestDocIdx = 0;
      let earliestTime = doctorFreeAt[0];
      for (let d = 1; d < params.doctorCount; d++) {
        if (doctorFreeAt[d] < earliestTime) {
          earliestTime = doctorFreeAt[d];
          earliestDocIdx = d;
        }
      }

      const start = Math.max(p.arrivalTime, earliestTime);
      p.fcfsStartTime = start;
      p.fcfsWait = start - p.arrivalTime;
      doctorFreeAt[earliestDocIdx] = start + p.consultDuration;
    }
  }

  // 2. Simulate Static Priority Policy (No Aging)
  {
    const doctorFreeAt = new Array(params.doctorCount).fill(0);
    const unserved = [...patients];
    let currentTime = 0;

    while (unserved.length > 0) {
      // Find doctor available next
      let minDocTime = Infinity;
      let docIdx = 0;
      for (let d = 0; d < params.doctorCount; d++) {
        if (doctorFreeAt[d] < minDocTime) {
          minDocTime = doctorFreeAt[d];
          docIdx = d;
        }
      }

      currentTime = Math.max(currentTime, minDocTime);

      // Filter patients who have arrived by currentTime
      let available = unserved.filter((p) => p.arrivalTime <= currentTime);
      if (available.length === 0) {
        // Advance time to next arrival
        currentTime = Math.min(...unserved.map((p) => p.arrivalTime));
        available = unserved.filter((p) => p.arrivalTime <= currentTime);
      }

      // Pick highest base priority score
      available.sort((a, b) => {
        if (b.baseScore !== a.baseScore) return b.baseScore - a.baseScore;
        return a.arrivalTime - b.arrivalTime;
      });

      const chosen = available[0];
      const start = Math.max(chosen.arrivalTime, doctorFreeAt[docIdx]);
      chosen.staticStartTime = start;
      chosen.staticWait = start - chosen.arrivalTime;
      doctorFreeAt[docIdx] = start + chosen.consultDuration;

      const idx = unserved.indexOf(chosen);
      unserved.splice(idx, 1);
    }
  }

  // 3. Simulate Dynamic Aging Policy (Base Score + Waiting Time / agingDivisor)
  {
    const doctorFreeAt = new Array(params.doctorCount).fill(0);
    const unserved = [...patients];
    let currentTime = 0;

    while (unserved.length > 0) {
      let minDocTime = Infinity;
      let docIdx = 0;
      for (let d = 0; d < params.doctorCount; d++) {
        if (doctorFreeAt[d] < minDocTime) {
          minDocTime = doctorFreeAt[d];
          docIdx = d;
        }
      }

      currentTime = Math.max(currentTime, minDocTime);

      let available = unserved.filter((p) => p.arrivalTime <= currentTime);
      if (available.length === 0) {
        currentTime = Math.min(...unserved.map((p) => p.arrivalTime));
        available = unserved.filter((p) => p.arrivalTime <= currentTime);
      }

      // Sort by (baseScore + aging bonus)
      available.sort((a, b) => {
        const waitA = currentTime - a.arrivalTime;
        const agingA = Math.min(waitA / params.agingDivisor, params.agingCap);
        const scoreA = a.baseScore + agingA;

        const waitB = currentTime - b.arrivalTime;
        const agingB = Math.min(waitB / params.agingDivisor, params.agingCap);
        const scoreB = b.baseScore + agingB;

        if (scoreB !== scoreA) return scoreB - scoreA;
        return a.arrivalTime - b.arrivalTime;
      });

      const chosen = available[0];
      const start = Math.max(chosen.arrivalTime, doctorFreeAt[docIdx]);
      chosen.dynamicStartTime = start;
      chosen.dynamicWait = start - chosen.arrivalTime;
      doctorFreeAt[docIdx] = start + chosen.consultDuration;

      const idx = unserved.indexOf(chosen);
      unserved.splice(idx, 1);
    }
  }

  return {
    patients,
    fcfs: calculateMetrics(patients, "fcfsWait"),
    staticPriority: calculateMetrics(patients, "staticWait"),
    dynamicAging: calculateMetrics(patients, "dynamicWait"),
  };
}
