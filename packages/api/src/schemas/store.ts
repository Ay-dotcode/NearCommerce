import { z } from "zod";

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format HH:MM");

export const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

const DayHoursSchema = z
  .object({
    open: timeSchema,
    close: timeSchema,
    isClosed: z.boolean().default(false),
    // Legacy alias of `isClosed`, still accepted so existing clients keep working.
    closed: z.boolean().optional(),
  })
  .nullable();

export const StoreOpeningHoursSchema = z
  .record(z.enum(WEEKDAYS), DayHoursSchema)
  // A day that is open must close after it opens (overnight hours are not supported).
  .superRefine((hours, ctx) => {
    for (const [day, value] of Object.entries(hours)) {
      if (!value || value.isClosed || value.closed) continue;
      if (value.open >= value.close)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Closing time must be after opening time",
          path: [day, "close"],
        });
    }
  });

export const StoreResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  timezone: z.string(),
  opening_hours: StoreOpeningHoursSchema,
  isOpen: z.boolean(),
});

const StoreFieldsShape = {
  name: z.string().trim().min(2, "Store name is required").max(255),
  description: z.string().trim().max(2000).optional(),
  address: z.string().trim().min(5, "Full address is required").max(500),
  latitude: z.number().min(-90, "Invalid latitude").max(90, "Invalid latitude"),
  longitude: z
    .number()
    .min(-180, "Invalid longitude")
    .max(180, "Invalid longitude"),
  timezone: z.string().trim().min(1).max(50),
  openingHours: StoreOpeningHoursSchema,
};

export const CreateStoreSchema = z.object({
  ...StoreFieldsShape,
  timezone: StoreFieldsShape.timezone.default("UTC"),
});

// PATCH/PUT semantics: any subset of fields, but never an empty body.
export const UpdateStoreSchema = z
  .object(StoreFieldsShape)
  .partial()
  .extend({ description: z.string().trim().max(2000).nullable().optional() })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });

export type CreateStoreInput = z.infer<typeof CreateStoreSchema>;
export type UpdateStoreInput = z.infer<typeof UpdateStoreSchema>;
