import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { WEEKDAYS, type Weekday } from "@nearcommerce/api";
import { DAY_LABELS, type DayState, type HoursState } from "../lib/hours";

interface Props {
  value: HoursState;
  onChange: (next: HoursState) => void;
  // Keyed by weekday, e.g. { monday: "Closing time must be after opening time" }
  errors?: Partial<Record<Weekday, string>>;
}

const timeInput =
  "h-9 w-[7.5rem] rounded-md border border-slate-300 bg-white px-2 text-sm tabular-nums shadow-card focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";

export function OpeningHoursEditor({ value, onChange, errors = {} }: Props) {
  const update = (day: Weekday, patch: Partial<DayState>) => onChange({ ...value, [day]: { ...value[day], ...patch } });

  const copyMondayToWeekdays = () => {
    const next = { ...value };
    for (const day of ["tuesday", "wednesday", "thursday", "friday"] as const) next[day] = { ...value.monday };
    onChange(next);
  };

  return (
    <fieldset>
      {/* The legend must be the fieldset's first child for it to name the group. */}
      <legend className="text-sm font-medium text-slate-700">Opening hours</legend>
      <div className="mt-0.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="text-sm text-slate-500">
          Times are in the store&apos;s timezone. Shoppers see an Open or Closed badge based on these hours.
        </p>
        <Button variant="ghost" size="sm" onClick={copyMondayToWeekdays}>
          Copy Monday to Tue–Fri
        </Button>
      </div>

      <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {WEEKDAYS.map((day) => {
          const d = value[day];
          const error = errors[day];
          return (
            <li key={day} className="px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <label className="flex w-36 items-center gap-2 text-sm font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={!d.isClosed}
                    onChange={(e) => update(day, { isClosed: !e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    aria-label={`${DAY_LABELS[day]} open`}
                  />
                  {DAY_LABELS[day]}
                </label>

                {d.isClosed ? (
                  <span className="text-sm text-slate-500">Closed</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={d.open}
                      onChange={(e) => update(day, { open: e.target.value })}
                      aria-label={`${DAY_LABELS[day]} opens at`}
                      aria-invalid={Boolean(error) || undefined}
                      className={cn(timeInput, error && "border-red-400")}
                    />
                    <span aria-hidden="true" className="text-slate-400">
                      –
                    </span>
                    <input
                      type="time"
                      value={d.close}
                      onChange={(e) => update(day, { close: e.target.value })}
                      aria-label={`${DAY_LABELS[day]} closes at`}
                      aria-invalid={Boolean(error) || undefined}
                      className={cn(timeInput, error && "border-red-400")}
                    />
                  </div>
                )}
              </div>
              {error && (
                <p role="alert" className="mt-1.5 text-sm text-red-600">
                  {DAY_LABELS[day]}: {error}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
