import { z } from "zod";

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format HH:MM");

export const StoreOpeningHoursSchema = z.record(
  z.enum([
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ]),
  z
    .object({
      open: timeSchema,
      close: timeSchema,
      isClosed: z.boolean().default(false),
      closed: z.boolean().optional(),
    })
    .nullable(),
);

export const StoreResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  timezone: z.string(),
  opening_hours: StoreOpeningHoursSchema,
  isOpen: z.boolean(),
});
