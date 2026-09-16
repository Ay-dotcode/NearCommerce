import { z } from "zod";

export const SearchQuerySchema = z.object({
  q: z.string().optional(), // The search term (e.g., "fresh milk")
  lat: z.coerce.number().min(-90).max(90, "Latitude must be between -90 and 90"),
  lng: z.coerce.number().min(-180).max(180, "Longitude must be between -180 and 180"),
  radius_meters: z.coerce.number().positive().default(5000), // Default 5km radius
});

export type SearchQueryInput = z.infer<typeof SearchQuerySchema>;
