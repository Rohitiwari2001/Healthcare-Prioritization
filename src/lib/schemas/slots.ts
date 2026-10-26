import { z } from "zod";

export const slotBlockSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm"),
  end: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm"),
});

export const generateSlotsSchema = z
  .object({
    doctorId: z.string().min(1, "Doctor ID is required"),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
    // Accepts either canonical 'blocks' or legacy 'timeBlocks'
    blocks: z.array(slotBlockSchema).optional(),
    timeBlocks: z.array(slotBlockSchema).optional(),
    // Accepts either canonical 'slotMinutes' or legacy 'slotDurationMinutes'
    slotMinutes: z.number().int().min(5).max(60).optional(),
    slotDurationMinutes: z.number().int().min(5).max(60).optional(),
  })
  .transform((data) => {
    const blocks = data.blocks || data.timeBlocks || [];
    const slotMinutes = data.slotMinutes ?? data.slotDurationMinutes ?? 15;
    return {
      doctorId: data.doctorId,
      dateFrom: data.dateFrom,
      dateTo: data.dateTo,
      blocks,
      slotMinutes,
    };
  })
  .refine((data) => data.blocks.length > 0, {
    message: "At least one time block is required",
    path: ["blocks"],
  })
  .refine((data) => data.slotMinutes >= 5 && data.slotMinutes <= 60, {
    message: "Slot duration must be between 5 and 60 minutes",
    path: ["slotMinutes"],
  });

export type GenerateSlotsDto = z.infer<typeof generateSlotsSchema>;

export const toggleBlockSlotSchema = z.object({
  blocked: z.boolean(),
  reason: z.string().optional(),
});

export type ToggleBlockSlotDto = z.infer<typeof toggleBlockSlotSchema>;
