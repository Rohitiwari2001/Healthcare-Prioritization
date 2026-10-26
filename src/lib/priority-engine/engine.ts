import {
  PriorityConfigParams,
  BaseScoreResult,
  PatientAssessmentInput,
  QueueItem,
} from "./types";
import { Severity } from "../constants/enums";

export function evaluateRedFlags(
  symptoms: string[],
  config: PriorityConfigParams
): boolean {
  if (!symptoms || !symptoms.length || !config.redFlags) return false;
  const flagSet = new Set(config.redFlags);
  return symptoms.some((s) => flagSet.has(s));
}

export function getAgePoints(
  age: number,
  config: PriorityConfigParams
): number {
  const roundedAge = Math.floor(age);
  const match = config.agePoints.find(
    (band) => roundedAge >= band.min && roundedAge <= band.max
  );
  return match ? match.points : 0;
}

export function computeBase(
  patient: { age: number },
  assessment: PatientAssessmentInput,
  config: PriorityConfigParams
): BaseScoreResult {
  const hasRedFlag = evaluateRedFlags(assessment.symptoms, config);
  const severityEffective: Severity = hasRedFlag
    ? "CRITICAL"
    : assessment.severitySelf;

  const severityPts = config.severityPoints[severityEffective] ?? 0;
  const agePts = getAgePoints(patient.age, config);

  const suddenPts =
    assessment.onset === "SUDDEN" ? config.urgencyPoints.suddenOnset : 0;
  const durationPts =
    assessment.durationHours < 24 ? config.urgencyPoints.durationUnder24h : 0;
  const selfUrgentPts =
    assessment.selfUrgent ? config.urgencyPoints.selfUrgent : 0;

  const urgencyPts = suddenPts + durationPts + selfUrgentPts;

  const baseScore =
    config.weights.w1 * severityPts +
    config.weights.w2 * agePts +
    config.weights.w3 * urgencyPts;

  return {
    baseScore,
    severityEffective,
    severityPts,
    agePts,
    urgencyPts,
    emergencyFlag: hasRedFlag,
  };
}

export function computeAging(
  checkInTime: Date | string | number | null | undefined,
  now: Date | string | number,
  config: PriorityConfigParams
): number {
  if (!checkInTime) return 0;

  const startMs = new Date(checkInTime).getTime();
  const nowMs = new Date(now).getTime();
  const waitMinutes = Math.max(0, Math.floor((nowMs - startMs) / 60000));

  const aging = waitMinutes / config.aging.divisorMinutes;
  return Math.min(aging, config.aging.cap);
}

export function computeFinal(
  appointment: {
    baseScore: number;
    checkInTime?: Date | string | number | null;
    manualAdjustment?: number | null;
  },
  now: Date | string | number,
  config: PriorityConfigParams
): number {
  const aging = computeAging(appointment.checkInTime, now, config);
  const manual = appointment.manualAdjustment ?? 0;
  return appointment.baseScore + aging + manual;
}

export function sortQueue<T extends QueueItem>(
  appointments: T[],
  now: Date | string | number,
  config: PriorityConfigParams
): (T & { aging: number; finalScore: number })[] {
  const inProgress: (T & { aging: number; finalScore: number })[] = [];
  const waiting: (T & { aging: number; finalScore: number })[] = [];

  for (const appt of appointments) {
    const aging = computeAging(appt.checkInTime, now, config);
    const finalScore = computeFinal(appt, now, config);
    const itemWithScore = { ...appt, aging, finalScore };

    if (appt.status === "IN_PROGRESS") {
      inProgress.push(itemWithScore);
    } else {
      waiting.push(itemWithScore);
    }
  }

  // Sort waiting by finalScore DESC, then tieBreakAt ASC
  waiting.sort((a, b) => {
    if (b.finalScore !== a.finalScore) {
      return b.finalScore - a.finalScore;
    }
    const timeA = new Date(a.tieBreakAt).getTime();
    const timeB = new Date(b.tieBreakAt).getTime();
    return timeA - timeB;
  });

  return [...inProgress, ...waiting];
}
