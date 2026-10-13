import {
  defaultHours,
  hoursFromApi,
  hoursToPayload,
  type HoursState,
} from "@/features/stores/lib/hours";
import { OpeningHoursEditor } from "@/features/stores/ui/OpeningHoursEditor";
import type { Store, StorePayload } from "@/types/stores";
import {
  CreateStoreSchema,
  parseApiError,
  type Weekday,
} from "@nearcommerce/api";
import { Button, FormTextAreaField, FormTextField } from "@nearcommerce/ui";
import { FormikErrors, FormikProvider, useFormik } from "formik";
import { ReactNode, useMemo, useState } from "react";

interface Props {
  initial?: Store;
  submitLabel: string;
  onSubmit: (payload: StorePayload) => Promise<void>;
  onCancel?: () => void;
  // Rendered next to the submit button.
  extraActions?: ReactNode;
}

interface StoreFormValues {
  name: string;
  description: string;
  address: string;
  latitude: string;
  longitude: string;
  timezone: string;
  hours: HoursState;
}

type HourErrors = Partial<Record<Weekday, string>>;

const browserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

const listTimezones = (): string[] => {
  try {
    return (Intl as any).supportedValuesOf("timeZone");
  } catch {
    return ["UTC", "Europe/London", "America/New_York", "Asia/Tokyo"];
  }
};

// Turns the form values into the shape the API's zod schema validates.
const toSchemaInput = (values: StoreFormValues) => ({
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
function validateStore(values: StoreFormValues): FormikErrors<StoreFormValues> {
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

// Shared by onboarding (create) and store settings (edit).
export function StoreForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  extraActions,
}: Props) {
  const timezones = useMemo(listTimezones, []);
  const [formError, setFormError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const formik = useFormik<StoreFormValues>({
    initialValues: {
      name: initial?.name ?? "",
      description: initial?.description ?? "",
      address: initial?.address ?? "",
      latitude: initial ? String(initial.latitude) : "",
      longitude: initial ? String(initial.longitude) : "",
      timezone: initial?.timezone ?? browserTimezone(),
      hours: initial ? hoursFromApi(initial.opening_hours) : defaultHours(),
    },
    validate: validateStore,
    validateOnChange: false,
    onSubmit: async (values, helpers) => {
      setFormError(null);
      const parsed = CreateStoreSchema.parse(toSchemaInput(values));
      try {
        await onSubmit({
          ...parsed,
          openingHours: hoursToPayload(values.hours),
        } as StorePayload);
      } catch (err) {
        const apiError = parseApiError(
          err,
          "We couldn't save the store. Please try again.",
        );
        const fieldErrors: Record<string, string> = {};
        const hours: HourErrors = {};
        for (const d of apiError.details) {
          const [root, day] = d.path.split(".");
          if (root === "openingHours" && day)
            hours[day as Weekday] ??= d.message;
          else fieldErrors[d.path] = d.message;
        }
        if (Object.keys(hours).length > 0)
          (fieldErrors as Record<string, unknown>).hours = hours;
        helpers.setErrors(fieldErrors as FormikErrors<StoreFormValues>);
        setFormError(apiError.message);
      }
    },
  });

  const hourErrors = (formik.errors.hours ?? {}) as unknown as HourErrors;

  const useMyLocation = () => {
    setFormError(null);
    if (!navigator.geolocation)
      return setFormError(
        "Location isn't available in this browser. Enter the coordinates manually.",
      );
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        formik.setFieldValue("latitude", pos.coords.latitude.toFixed(6));
        formik.setFieldValue("longitude", pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => {
        setFormError(
          "We couldn't get your location. Allow location access or enter the coordinates manually.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  return (
    <FormikProvider value={formik}>
      <form onSubmit={formik.handleSubmit} noValidate className="space-y-8">
        <section aria-labelledby="store-details-heading" className="space-y-4">
          <h2
            id="store-details-heading"
            className="text-base font-semibold text-slate-900"
          >
            Store details
          </h2>
          <FormTextField
            name="name"
            label="Store name"
            required
            autoComplete="organization"
          />
          <FormTextAreaField
            name="description"
            label="Description"
            rows={3}
            hint="Shown to shoppers on your store page."
          />
          <FormTextField
            name="address"
            label="Street address"
            required
            autoComplete="street-address"
          />
        </section>

        <section aria-labelledby="store-location-heading" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2
                id="store-location-heading"
                className="text-base font-semibold text-slate-900"
              >
                Location
              </h2>
              <p className="text-sm text-slate-500">
                Used to place your store in nearby search results.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={useMyLocation}
              loading={locating}
            >
              Use my location
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormTextField
              name="latitude"
              label="Latitude"
              required
              inputMode="decimal"
              placeholder="35.1856"
            />
            <FormTextField
              name="longitude"
              label="Longitude"
              required
              inputMode="decimal"
              placeholder="33.3823"
            />
          </div>
          <div>
            <FormTextField
              name="timezone"
              label="Timezone"
              required
              list="timezone-options"
              hint="Start typing to search, for example Europe/London."
              autoComplete="off"
            />
            <datalist id="timezone-options">
              {timezones.map((tz) => (
                <option key={tz} value={tz} />
              ))}
            </datalist>
          </div>
        </section>

        <section>
          <OpeningHoursEditor
            value={formik.values.hours}
            onChange={(next) => formik.setFieldValue("hours", next)}
            errors={formik.submitCount > 0 ? hourErrors : {}}
          />
        </section>

        {formError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {formError}
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-end">
          {extraActions}
          {onCancel && (
            <Button
              variant="secondary"
              onClick={onCancel}
              disabled={formik.isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" loading={formik.isSubmitting}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </FormikProvider>
  );
}
