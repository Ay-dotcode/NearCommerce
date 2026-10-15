import { niceMax } from "@/helpers/chart";
import type { ActivityDay } from "@/types/admin";
import { cn, formatShortDate } from "@nearcommerce/helpers";

type SeriesKey = "users" | "stores" | "reviews";

const SERIES: { key: SeriesKey; label: string; stroke: string; dot: string }[] =
  [
    {
      key: "users",
      label: "New users",
      stroke: "stroke-brand-600",
      dot: "bg-brand-600",
    },
    {
      key: "stores",
      label: "New stores",
      stroke: "stroke-emerald-500",
      dot: "bg-emerald-500",
    },
    {
      key: "reviews",
      label: "New reviews",
      stroke: "stroke-amber-500",
      dot: "bg-amber-500",
    },
  ];

const W = 640;
const H = 240;
const PAD = { top: 12, right: 12, bottom: 28, left: 32 };

// Line chart of daily signups, new stores and new reviews. Drawn as plain SVG so it follows the
// light/dark theme through the shared colour tokens; each point carries a native tooltip and
// the same numbers are available as a hidden table for screen readers.
export function ActivityChart({ data }: { data: ActivityDay[] }) {
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const max = niceMax(
    Math.max(0, ...data.flatMap((d) => SERIES.map((s) => d[s.key]))),
  );
  const x = (i: number) =>
    PAD.left +
    (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const ticks = [0, 1, 2, 3, 4].map((i) => (max / 4) * i);
  const labelEvery = data.length > 8 ? 2 : 1;

  return (
    <figure>
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", s.dot)} />
            {s.label}
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="New users, stores and reviews over the last 14 days"
        className="h-auto w-full"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(t)}
              y2={y(t)}
              className="stroke-slate-200"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={y(t) + 4}
              textAnchor="end"
              className="fill-slate-500 text-[10px]"
            >
              {Math.round(t)}
            </text>
          </g>
        ))}

        {data.map((d, i) =>
          i % labelEvery === 0 ? (
            <text
              key={d.date}
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              className="fill-slate-500 text-[10px]"
            >
              {formatShortDate(d.date)}
            </text>
          ) : null,
        )}

        {SERIES.map((s) => (
          <g key={s.key}>
            <polyline
              fill="none"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              className={s.stroke}
              points={data.map((d, i) => `${x(i)},${y(d[s.key])}`).join(" ")}
            />
            {data.map((d, i) => (
              <circle
                key={d.date}
                cx={x(i)}
                cy={y(d[s.key])}
                r={3}
                className={cn(s.stroke, "fill-white")}
                strokeWidth={2}
              >
                <title>{`${formatShortDate(d.date)}: ${d[s.key]} ${s.label.toLowerCase()}`}</title>
              </circle>
            ))}
          </g>
        ))}
      </svg>

      <table className="sr-only">
        <caption>Daily activity for the last 14 days</caption>
        <thead>
          <tr>
            <th>Date</th>
            {SERIES.map((s) => (
              <th key={s.key}>{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <td>{formatShortDate(d.date)}</td>
              {SERIES.map((s) => (
                <td key={s.key}>{d[s.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
