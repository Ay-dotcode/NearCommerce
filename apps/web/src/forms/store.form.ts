import {
  defaultHours,
  hoursFromApi,
  hoursToPayload,
  type HoursState,
} from "@/helpers/hours";
import { browserTimezone } from "@/helpers/timezone";
import type { Store } from "@/types/stores";
import { CreateStoreSchema, type Weekday } from "@nearcommerce/api";
import type { FormikErrors } from "formik";

// What the store form edits. Coordinates are kept as text while typing.
export interface StoreFormValues {
  name: string;
  description: string;
  address: string;
  latitude: string;
  longitude: string;
  timezone: string;
  hours: HoursState;
}

export type HourErrors = Partial<Record<Weekday, string>>;

// Starting values: a blank store (in the browser's timezone), or the store being edited.
export function storeInitialValues(initial?: Store): StoreFormValues {
  return {
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    address: initial?.address ?? "",
    latitude: initial ? String(initial.latitude) : "",
    longitude: initial ? String(initial.longitude) : "",
    timezone: initial?.timezone ?? browserTimezone(),
    hours: initial ? hoursFromApi(initial.opening_hours) : defaultHours(),
  };
}

// Turns the form values into the shape the API's zod schema validates.
export const toSchemaInput = (values: StoreFormValues) => ({
  name: values.name,
  description: values.description.trim() || undefined,
  address: values.address,
  latitude: values.latitude.trim() === "" ? NaN : Number(values.latitude),
  longitude: values.longitude.trim() === "" ? NaN : Number(values.longitude),
  timezone: values.timezone,
  openingHours: hoursToPayload(values.hours),
});

// Validates with the same zod schema the API uses. Opening-hour problems are grouped per
// weekday under `hours` so the editor can show them next to the right row.
export function validateStore(
  values: StoreFormValues,
): FormikErrors<StoreFormValues> {
  const parsed = CreateStoreSchema.safeParse(toSchemaInput(values));
  if (parsed.success) return {};
  const errors: Record<string, string> = {};
  const hours: HourErrors = {};
  for (const issue of parsed.error.issues) {
    // Empty or non-numeric coordinates surface as "Expected number, received nan".
    const message = /nan|expected number/i.test(issue.message)
      ? "Enter a valid number"
      : issue.message;
    const [root, day] = issue.path.map(String);
    if (root === "openingHours" && day) hours[day as Weekday] ??= message;
    else errors[root] ??= message;
  }
  if (Object.keys(hours).length > 0)
    (errors as Record<string, unknown>).hours = hours;
  return errors as FormikErrors<StoreFormValues>;
}

// Puts the server's field errors on the matching inputs (opening-hour problems per weekday).
export function serverErrorsToFormik(
  details: { path: string; message: string }[],
): FormikErrors<StoreFormValues> {
  const errors: Record<string, unknown> = {};
  const hours: HourErrors = {};
  for (const d of details) {
    const [root, day] = d.path.split(".");
    if (root === "openingHours" && day) hours[day as Weekday] ??= d.message;
    else errors[d.path] = d.message;
  }
  if (Object.keys(hours).length > 0) errors.hours = hours;
  return errors as FormikErrors<StoreFormValues>;
}
