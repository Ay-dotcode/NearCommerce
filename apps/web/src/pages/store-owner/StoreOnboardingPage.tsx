import { AppRoutes } from "@/constants/routes";
import { CreateStoreSchema, httpClient } from "@nearcommerce/api";
import { FormEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const STORE_KEY = "x-store-id";

const DEFAULT_OPENING_HOURS = {
  monday: { open: "09:00", close: "18:00", closed: false },
  tuesday: { open: "09:00", close: "18:00", closed: false },
  wednesday: { open: "09:00", close: "18:00", closed: false },
  thursday: { open: "09:00", close: "18:00", closed: false },
  friday: { open: "09:00", close: "18:00", closed: false },
  saturday: { open: "10:00", close: "16:00", closed: false },
  sunday: { open: "00:00", close: "00:00", closed: true },
};

export function StoreOnboardingPage() {
  const navigate = useNavigate();
  const timezones = useMemo(() => {
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch {
      return ["UTC", "America/New_York", "Europe/London", "Asia/Tokyo"];
    }
  }, []);

  const [form, setForm] = useState({
    name: "",
    description: "",
    address: "",
    latitude: "",
    longitude: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  });
  const [openingHours] = useState(DEFAULT_OPENING_HOURS);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const hasStores = Boolean(localStorage.getItem(STORE_KEY));

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const useMyLocation = () => {
    if (!navigator.geolocation)
      return setErrors(["Geolocation is not available in this browser."]);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setLocating(false);
      },
      () => {
        setErrors(["Couldn't get your location. Enter coordinates manually."]);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors([]);
    const parsed = CreateStoreSchema.safeParse({
      name: form.name,
      description: form.description || undefined,
      address: form.address,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      timezone: form.timezone,
      opening_hours: openingHours,
    });
    if (!parsed.success) {
      return setErrors(
        parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      );
    }
    setBusy(true);
    try {
      const res = await httpClient.post<{ data: { id: string } }>(
        "/stores",
        parsed.data,
      );
      localStorage.setItem(STORE_KEY, res.data.data.id);
      navigate(AppRoutes.storeOwnerDashboard, { replace: true });
    } catch (err: any) {
      setErrors([
        err.response?.data?.error ??
          "Could not create the store. Please try again.",
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-1 text-2xl font-semibold">
        {hasStores ? "Add another store" : "Set up your store"}
      </h1>
      <p className="mb-6 text-sm text-slate-600">
        Customers will find you through search once you add products.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <input
          className="w-full rounded border p-2"
          placeholder="Store name"
          value={form.name}
          onChange={set("name")}
        />
        <textarea
          className="w-full rounded border p-2"
          placeholder="Description (optional)"
          value={form.description}
          onChange={set("description")}
        />
        <input
          className="w-full rounded border p-2"
          placeholder="Street address"
          value={form.address}
          onChange={set("address")}
        />

        <div className="flex items-end gap-2">
          <input
            className="w-full rounded border p-2"
            placeholder="Latitude"
            inputMode="decimal"
            value={form.latitude}
            onChange={set("latitude")}
          />
          <input
            className="w-full rounded border p-2"
            placeholder="Longitude"
            inputMode="decimal"
            value={form.longitude}
            onChange={set("longitude")}
          />
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="whitespace-nowrap rounded border px-3 py-2 text-sm"
          >
            {locating ? "Locating…" : "Use my location"}
          </button>
        </div>

        <select
          className="w-full rounded border p-2"
          value={form.timezone}
          onChange={set("timezone")}
        >
          {timezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>

        {errors.length > 0 && (
          <ul className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {errors.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}

        <div className="flex gap-2">
          <button
            disabled={busy}
            type="submit"
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create store"}
          </button>
          {hasStores && (
            <button
              type="button"
              onClick={() => navigate(AppRoutes.storeOwnerDashboard)}
              className="rounded border px-4 py-2"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
