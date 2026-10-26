import { Severity, Onset, ChiefComplaint } from "../constants/enums";

export interface AgePointBand {
  min: number;
  max: number;
  points: number;
}

export interface PriorityConfigParams {
  weights: {
    w1: number;
    w2: number;
    w3: number;
  };
  severityPoints: Record<Severity, number>;
  agePoints: AgePointBand[];
  urgencyPoints: {
    suddenOnset: number;
    durationUnder24h: number;
    selfUrgent: number;
  };
  aging: {
    divisorMinutes: number;
    cap: number;
  };
  noShowGraceMinutes: number;
  redFlags: string[];
}

export interface BaseScoreResult {
  baseScore: number;
  severityEffective: Severity;
  severityPts: number;
  agePts: number;
  urgencyPts: number;
  emergencyFlag: boolean;
}

export interface PatientAssessmentInput {
  chiefComplaint: ChiefComplaint;
  symptoms: string[];
  notes?: string | null;
  severitySelf: Severity;
  onset: Onset;
  durationHours: number;
  selfUrgent: boolean;
}

export interface QueueItem {
  id: string;
  baseScore: number;
  checkInTime: Date | string | number | null;
  manualAdjustment?: number | null;
  tieBreakAt: Date | string | number;
  status: string;
  [key: string]: unknown;
}
