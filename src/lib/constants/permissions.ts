import { Role } from "./enums";

export const PERMISSION_KEYS = [
  // Users
  "users.manage",
  "permissions.manage",
  // Catalogue
  "doctors.manage",
  "specializations.manage",
  "slots.manage",
  "slots.manage_own",
  // Patients
  "patients.search",
  "patients.create_profile",
  // Appointments (self)
  "appointments.book_self",
  "appointments.cancel_self",
  "appointments.checkin_self",
  "appointments.edit_symptoms_self",
  // Appointments (staff)
  "appointments.book_for_patient",
  "appointments.cancel_for_patient",
  "appointments.checkin_for_patient",
  "appointments.edit_symptoms_for_patient",
  "appointments.register_walkin",
  // Queue
  "queue.view_own",
  "queue.view_all",
  "queue.view_breakdown",
  // Consultation
  "consultation.manage",
  // Priority
  "priority.override",
  // Reports
  "reports.view_own",
  "reports.view",
  // Administration
  "config.edit",
  "audit.view",
  "simulation.run",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const ROLE_DEFAULTS: Record<Role, readonly PermissionKey[]> = {
  patient: [
    "appointments.book_self",
    "appointments.cancel_self",
    "appointments.checkin_self",
    "appointments.edit_symptoms_self",
  ],
  doctor: [
    "slots.manage_own",
    "queue.view_own",
    "queue.view_breakdown",
    "consultation.manage",
    "priority.override",
    "reports.view_own",
  ],
  receptionist: [
    "patients.search",
    "patients.create_profile",
    "appointments.book_for_patient",
    "appointments.cancel_for_patient",
    "appointments.checkin_for_patient",
    "appointments.edit_symptoms_for_patient",
    "appointments.register_walkin",
    "queue.view_all",
  ],
  admin: [
    "users.manage",
    "permissions.manage",
    "doctors.manage",
    "specializations.manage",
    "slots.manage",
    "patients.search",
    "patients.create_profile",
    "appointments.book_for_patient",
    "appointments.cancel_for_patient",
    "appointments.checkin_for_patient",
    "appointments.edit_symptoms_for_patient",
    "appointments.register_walkin",
    "queue.view_all",
    "queue.view_breakdown",
    "priority.override",
    "reports.view",
    "config.edit",
    "audit.view",
    "simulation.run",
  ],
};

/**
 * Computes effective permissions:
 * effective = (roleDefaults + grants) - denies
 * If active is false, returns empty array.
 */
export function computeEffectivePermissions(
  role: Role,
  grants: readonly string[] = [],
  denies: readonly string[] = [],
  active: boolean = true
): PermissionKey[] {
  if (!active) return [];

  const defaults = ROLE_DEFAULTS[role] ?? [];
  const validGrants = grants.filter((g): g is PermissionKey =>
    (PERMISSION_KEYS as readonly string[]).includes(g)
  );
  const denySet = new Set(denies);

  const combined = new Set<PermissionKey>([...defaults, ...validGrants]);

  // Deny always wins
  for (const d of denySet) {
    combined.delete(d as PermissionKey);
  }

  return Array.from(combined);
}
