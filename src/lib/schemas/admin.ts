import { z } from "zod";
import { ROLES, RED_FLAGS, SEVERITIES } from "../constants/enums";
import { PERMISSION_KEYS } from "../constants/permissions";

export const createUserSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(2).max(80),
  role: z.enum(["doctor", "receptionist", "admin"]), // patients self-register!
  grants: z.array(z.enum(PERMISSION_KEYS)).optional().default([]),
  denies: z.array(z.enum(PERMISSION_KEYS)).optional().default([]),
  doctorProfile: z
    .object({
      specializationId: z.string().min(1),
      qualification: z.string().min(2).max(100),
      avgConsultMinutes: z.number().int().min(1).max(120),
    })
    .optional(),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;

export const updateUserAccessSchema = z.object({
  role: z.enum(["receptionist", "admin"]).optional(),
  grants: z.array(z.enum(PERMISSION_KEYS)).optional(),
  denies: z.array(z.enum(PERMISSION_KEYS)).optional(),
  active: z.boolean().optional(),
  reason: z.string().min(5).max(300),
});

export type UpdateUserAccessDto = z.infer<typeof updateUserAccessSchema>;

export const agePointBandSchema = z.object({
  min: z.number().int().min(0),
  max: z.number().int().max(150),
  points: z.number().min(0),
});

export const systemConfigParamsSchema = z.object({
  weights: z.object({
    w1: z.number().min(0),
    w2: z.number().min(0),
    w3: z.number().min(0),
  }),
  severityPoints: z.object({
    MILD: z.number().min(0),
    MODERATE: z.number().min(0),
    SEVERE: z.number().min(0),
    CRITICAL: z.number().min(0),
  }),
  agePoints: z.array(agePointBandSchema),
  urgencyPoints: z.object({
    suddenOnset: z.number().min(0),
    durationUnder24h: z.number().min(0),
    selfUrgent: z.number().min(0),
  }),
  aging: z.object({
    divisorMinutes: z.number().positive(),
    cap: z.number().min(0),
  }),
  noShowGraceMinutes: z.number().int().min(0).max(240),
  redFlags: z.array(z.enum(RED_FLAGS)),
});

export const updateConfigSchema = z.object({
  params: systemConfigParamsSchema,
  changeNote: z.string().min(5).max(300),
});

export type UpdateConfigDto = z.infer<typeof updateConfigSchema>;

export const setActiveConfigSchema = z.object({
  version: z.number().int().positive(),
  changeNote: z.string().min(5).max(300),
});

export type SetActiveConfigDto = z.infer<typeof setActiveConfigSchema>;

export function validateConfigParams(params: z.infer<typeof systemConfigParamsSchema>): string | null {
  const { severityPoints, agePoints } = params;
  if (!(severityPoints.MILD < severityPoints.MODERATE && severityPoints.MODERATE < severityPoints.SEVERE && severityPoints.SEVERE < severityPoints.CRITICAL)) {
    return "Severity points must be strictly increasing: MILD < MODERATE < SEVERE < CRITICAL";
  }
  const sorted = [...agePoints].sort((a, b) => a.min - b.min);
  if (sorted.length === 0 || sorted[0].min !== 0) {
    return "Age points must start at min 0";
  }
  if (sorted[sorted.length - 1].max !== 150) {
    return "Age points must end at max 150";
  }
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].min > sorted[i].max) {
      return `Age bracket min (${sorted[i].min}) cannot be greater than max (${sorted[i].max})`;
    }
    if (i > 0 && sorted[i].min !== sorted[i - 1].max + 1) {
      return `Age brackets have gap or overlap: bracket ends at ${sorted[i - 1].max} while next starts at ${sorted[i].min}`;
    }
  }
  return null;
}
