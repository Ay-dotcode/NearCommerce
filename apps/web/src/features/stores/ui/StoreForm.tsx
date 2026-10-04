import { parseApiError } from "@/api/errors";
import { Button, TextAreaField, TextField } from "@/components/ui";
import {
  defaultHours,
  hoursFromApi,
  hoursToPayload,
  type HoursState,
} from "@/features/stores/lib/hours";
import { OpeningHoursEditor } from "@/features/stores/ui/OpeningHoursEditor";
import type { Store, StorePayload } from "@/types/stores";
import { CreateStoreSchema, WEEKDAYS, type Weekday } from "@nearcommerce/api";
import { FormEvent, ReactNode, useMemo, useState } from "react";

interface Props {
  initial?: Store;
  submitLabel: string;
  onSubmit: (payload: StorePayload) => Promise<void>;
  onCancel?: () => void;
  // Rendered next to the submit button.
  extraActions?: ReactNode;
}

type FieldErrors = Record<string, string>;

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

// Shared by onboarding (create) and store settings (edit). Validates with the same zod schema the API uses.
export function StoreForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  extraActions,
}: Props) {
  const timezones = useMemo(listTimezones, []);
  const [values, setValues] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    address: initial?.address ?? "",
    latitude: initial ? String(initial.latitude) : "",
    longitude: initial ? String(initial.longitude) : "",
    timezone: initial?.timezone ?? browserTimezone(),
  });
  const [hours, setHours] = useState<HoursState>(
    initial ? hoursFromApi(initial.opening_hours) : defaultHours(),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);

  const set =
    (key: keyof typeof values) => (e: { target: { value: string } }) =>
      setValues((v) => ({ ...v, [key]: e.target.value }));

  const useMyLocation = () => {
    setFormError(null);
    if (!navigator.geolocation)
      return setFormError(
        "Location isn't available in this browser. Enter the coordinates manually.",
      );
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValues((v) => ({
          ...v,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
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

  const hourErrors = useMemo(() => {
    const out: Partial<Record<Weekday, string>> = {};
    for (const day of WEEKDAYS) {
      const message =
        errors[`openingHours.${day}.close`] ??
        errors[`openingHours.${day}.open`];
      if (message) out[day] = message;
    }
    return out;
  }, [errors]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const lat = values.latitude.trim() === "" ? NaN : Number(values.latitude);
    const lng = values.longitude.trim() === "" ? NaN : Number(values.longitude);
    const parsed = CreateStoreSchema.safeParse({
      name: values.name,
      description: values.description.trim() || undefined,
      address: values.address,
      latitude: lat,
      longitude: lng,
      timezone: values.timezone,
      openingHours: hoursToPayload(hours),
    });

    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".");
        // Empty or non-numeric coordinates surface as "Expected number, received nan".
        next[key] ??= /nan|expected number/i.test(issue.message)
          ? "Enter a valid number"
          : issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});

    setBusy(true);
    try {
      await onSubmit({
        ...parsed.data,
        openingHours: hoursToPayload(hours),
      } as StorePayload);
    } catch (err) {
      const apiError = parseApiError(
        err,
        "We couldn't save the store. Please try again.",
      );
      if (apiError.details.length > 0)
        setErrors(
          Object.fromEntries(apiError.details.map((d) => [d.path, d.message])),
        );
      setFormError(apiError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      <section aria-labelledby="store-details-heading" className="space-y-4">
        <h2
          id="store-details-heading"
          className="text-base font-semibold text-slate-900"
        >
          Store details
        </h2>
        <TextField
          label="Store name"
          required
          value={values.name}
          onChange={set("name")}
          error={errors.name}
          autoComplete="organization"
        />
        <TextAreaField
          label="Description"
          rows={3}
          value={values.description}
          onChange={set("description")}
          error={errors.description}
          hint="Shown to shoppers on your store page."
        />
        <TextField
          label="Street address"
          required
          value={values.address}
          onChange={set("address")}
          error={errors.address}
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
          <TextField
            label="Latitude"
            required
            inputMode="decimal"
            value={values.latitude}
            onChange={set("latitude")}
            error={errors.latitude}
            placeholder="35.1856"
          />
          <TextField
            label="Longitude"
            required
            inputMode="decimal"
            value={values.longitude}
            onChange={set("longitude")}
            error={errors.longitude}
            placeholder="33.3823"
          />
        </div>
        <div>
          <TextField
            label="Timezone"
            required
            list="timezone-options"
            value={values.timezone}
            onChange={set("timezone")}
            error={errors.timezone}
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
          value={hours}
          onChange={setHours}
          errors={hourErrors}
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
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={busy}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
