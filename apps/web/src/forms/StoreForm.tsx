import { hoursToPayload } from "@/helpers/hours";
import { OpeningHoursEditor } from "@/features/stores/ui/OpeningHoursEditor";
import type { Store, StorePayload } from "@/types/stores";
import { CreateStoreSchema, parseApiError } from "@nearcommerce/api";
import { Button, FormTextAreaField, FormTextField } from "@nearcommerce/ui";
import { FormikProvider, useFormik } from "formik";
import { ReactNode, useMemo, useState } from "react";
import { listTimezones } from "@/helpers/timezone";
import {
  serverErrorsToFormik,
  storeInitialValues,
  toSchemaInput,
  validateStore,
  type HourErrors,
  type StoreFormValues,
} from "@/forms/store.form";

interface Props {
  initial?: Store;
  submitLabel: string;
  onSubmit: (payload: StorePayload) => Promise<void>;
  onCancel?: () => void;
  // Rendered next to the submit button.
  extraActions?: ReactNode;
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
    initialValues: storeInitialValues(initial),
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
        helpers.setErrors(serverErrorsToFormik(apiError.details));
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
