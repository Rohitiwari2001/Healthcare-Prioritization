import { PriorityConfigParams } from "./types";

export const DEFAULT_CONFIG_PARAMS: PriorityConfigParams = {
  weights: {
    w1: 1.0,
    w2: 1.0,
    w3: 1.0,
  },
  severityPoints: {
    MILD: 10,
    MODERATE: 30,
    SEVERE: 60,
    CRITICAL: 100,
  },
  agePoints: [
    { min: 0, max: 0, points: 25 },
    { min: 1, max: 5, points: 20 },
    { min: 6, max: 17, points: 5 },
    { min: 18, max: 59, points: 0 },
    { min: 60, max: 74, points: 15 },
    { min: 75, max: 150, points: 25 },
  ],
  urgencyPoints: {
    suddenOnset: 10,
    durationUnder24h: 5,
    selfUrgent: 10,
  },
  aging: {
    divisorMinutes: 10,
    cap: 30,
  },
  noShowGraceMinutes: 20,
  redFlags: [
    "CHEST_PAIN",
    "SEVERE_BREATHING_DIFFICULTY",
    "UNCONSCIOUS",
    "SEVERE_BLEEDING",
    "STROKE_SIGNS",
    "SEIZURE",
    "SEVERE_ALLERGIC_REACTION",
    "SELF_HARM_THOUGHTS",
  ],
};
