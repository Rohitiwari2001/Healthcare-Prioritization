export const ROLES = ["patient", "doctor", "receptionist", "admin"] as const;
export type Role = (typeof ROLES)[number];

export function roleHome(role: Role): string {
  if (role === "receptionist") return "/reception";
  return `/${role}`;
}

export const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;
export type Gender = (typeof GENDERS)[number];

export const APPOINTMENT_STATUSES = [
  "BOOKED",
  "CHECKED_IN",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const APPOINTMENT_TYPES = ["ONLINE", "RECEPTION", "WALK_IN"] as const;
export type AppointmentType = (typeof APPOINTMENT_TYPES)[number];

export const SLOT_STATUSES = ["AVAILABLE", "BOOKED", "BLOCKED"] as const;
export type SlotStatus = (typeof SLOT_STATUSES)[number];

export const SEVERITIES = ["MILD", "MODERATE", "SEVERE", "CRITICAL"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const ONSETS = ["SUDDEN", "GRADUAL"] as const;
export type Onset = (typeof ONSETS)[number];

export const CHIEF_COMPLAINTS = [
  "FEVER",
  "COUGH",
  "CHEST_PAIN",
  "INJURY",
  "STOMACH_PAIN",
  "SKIN",
  "OTHER",
] as const;
export type ChiefComplaint = (typeof CHIEF_COMPLAINTS)[number];

export const RED_FLAGS = [
  "CHEST_PAIN",
  "SEVERE_BREATHING_DIFFICULTY",
  "UNCONSCIOUS",
  "SEVERE_BLEEDING",
  "STROKE_SIGNS",
  "SEIZURE",
  "SEVERE_ALLERGIC_REACTION",
  "SELF_HARM_THOUGHTS",
] as const;
export type RedFlag = (typeof RED_FLAGS)[number];

export const CREATED_VIA = ["SELF", "RECEPTION", "ADMIN"] as const;
export type CreatedVia = (typeof CREATED_VIA)[number];

export const AUDIT_ACTIONS = [
  "USER_CREATED",
  "ROLE_CHANGED",
  "PERMISSION_GRANTED",
  "PERMISSION_DENIED",
  "PERMISSION_RESET",
  "USER_DISABLED",
  "USER_ENABLED",
  "PATIENT_PROFILE_CREATED",
  "PATIENT_LINKED",
  "SYMPTOMS_EDITED",
  "PRIORITY_OVERRIDE",
  "APPOINTMENT_CANCELLED_ON_BEHALF",
  "CONFIG_UPDATED",
  "SEED_RUN",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];
