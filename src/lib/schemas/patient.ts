import { z } from "zod";
import { GENDERS } from "../constants/enums";

// E.164 phone regex (e.g. +919876543210 or 10-digit Indian mobile)
export const phoneRegex = /^(\+91)?[6-9]\d{9}$/;

export const createPatientProfileSchema = z
  .object({
    name: z.string().min(2).max(80),
    phone: z.string().regex(phoneRegex, "Must be a valid 10-digit Indian phone number (with optional +91)"),
    dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").optional(),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").optional(),
    gender: z.enum(GENDERS),
    bloodGroup: z.string().max(5).optional().nullable(),
    abhaId: z.string().max(30).optional().nullable(),
    address: z.string().max(200).optional().nullable(),
    confirmNew: z.boolean().optional(),
  })
  .transform((data) => ({
    ...data,
    dob: (data.dob || data.dateOfBirth)!,
  }))
  .refine((data) => !!data.dob, {
    message: "Date of birth is required (YYYY-MM-DD)",
    path: ["dob"],
  });

export type CreatePatientProfileDto = z.infer<typeof createPatientProfileSchema>;

export const updatePatientProfileSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  phone: z.string().regex(phoneRegex, "Must be a valid 10-digit Indian phone number").optional(),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").optional(),
  gender: z.enum(GENDERS).optional(),
  bloodGroup: z.string().max(5).optional().nullable(),
  abhaId: z.string().max(30).optional().nullable(),
});

export type UpdatePatientProfileDto = z.infer<typeof updatePatientProfileSchema>;

export const linkAccountSchema = z.object({
  targetPatientId: z.string().min(1),
  confirmedBy: z.string().min(3).max(200),
});

export type LinkAccountDto = z.infer<typeof linkAccountSchema>;
