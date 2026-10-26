import { AppointmentStatus } from "../constants/enums";
import { PriorityConfigParams } from "../priority-engine/types";

export const CLINIC_TIMEZONE = "Asia/Kolkata";

/**
 * Returns clinic date as YYYY-MM-DD in Asia/Kolkata
 */
export function todayKey(date: Date | string | number = new Date()): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CLINIC_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Formats time as HH:mm in Asia/Kolkata
 */
export function formatTime(date: Date | string | number): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: CLINIC_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/**
 * Derived status: if status is BOOKED and scheduledStartAt + grace < now, derived status is NO_SHOW
 */
export function displayStatus(
  appointment: {
    status: AppointmentStatus;
    scheduledStartAt?: Date | string | number | null;
  },
  now: Date | string | number,
  config: PriorityConfigParams
): AppointmentStatus {
  if (appointment.status === "BOOKED" && appointment.scheduledStartAt) {
    const slotStartMs = new Date(appointment.scheduledStartAt).getTime();
    const graceMs = (config.noShowGraceMinutes || 20) * 60 * 1000;
    const nowMs = new Date(now).getTime();
    if (slotStartMs + graceMs < nowMs) {
      return "NO_SHOW";
    }
  }
  return appointment.status;
}
