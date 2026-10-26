import { z } from "zod";
import { symptomAssessmentSchema } from "./assessment";

export const bookAppointmentSchema = z.object({
  patientId: z.string().optional(), // required for staff, ignored for patient
  doctorId: z.string().min(1),
  slotId: z.string().min(1),
  assessment: symptomAssessmentSchema,
});

export type BookAppointmentDto = z.infer<typeof bookAppointmentSchema>;

export const walkInSchema = z.object({
  patientId: z.string().min(1),
  doctorId: z.string().min(1),
  assessment: symptomAssessmentSchema,
});

export type WalkInDto = z.infer<typeof walkInSchema>;

export const editSymptomsSchema = z.object({
  assessment: symptomAssessmentSchema,
});

export type EditSymptomsDto = z.infer<typeof editSymptomsSchema>;

export const cancelAppointmentSchema = z.object({
  reason: z.string().max(200).optional(),
});

export type CancelAppointmentDto = z.infer<typeof cancelAppointmentSchema>;

export const overridePrioritySchema = z.object({
  manualAdjustment: z.number().int().min(-50).max(50),
  reason: z.string().min(10, "Reason must be at least 10 characters").max(300),
});

export type OverridePriorityDto = z.infer<typeof overridePrioritySchema>;

export const completeConsultationSchema = z.object({
  notes: z.string().max(2000),
  prescription: z.string().max(2000).optional().nullable(),
});

export type CompleteConsultationDto = z.infer<typeof completeConsultationSchema>;
