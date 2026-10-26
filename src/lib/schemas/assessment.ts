import { z } from "zod";
import { CHIEF_COMPLAINTS, SEVERITIES, ONSETS } from "../constants/enums";

export const symptomAssessmentSchema = z.object({
  chiefComplaint: z.enum(CHIEF_COMPLAINTS),
  symptoms: z.array(z.string().min(1).max(50)).max(20),
  notes: z.string().max(500).optional().nullable(),
  severitySelf: z.enum(["MILD", "MODERATE", "SEVERE"]), // CRITICAL is never self-selected!
  onset: z.enum(ONSETS),
  durationHours: z.number().int().min(0).max(8760),
  selfUrgent: z.boolean(),
});

export type SymptomAssessmentDto = z.infer<typeof symptomAssessmentSchema>;
