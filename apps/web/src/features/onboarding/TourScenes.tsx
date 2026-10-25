import { ReactNode, useEffect, useRef } from "react";

// Illustrations for the owner tour. Plain SVG with built-in (SMIL) animation, drawn with the
// palette's colour classes so they follow light and dark mode. All scenes share one canvas.

function Scene({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<SVGSVGElement>(null);
  // SMIL animations ignore the CSS reduced-motion rule, so freeze them explicitly.
  useEffect(() => {
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) ref.current?.pauseAnimations?.();
  }, []);
  return (
    <svg
      ref={ref}
      viewBox="0 0 320 220"
      role="img"
      aria-label={label}
      className="h-full max-h-56 w-full"
    >
      {children}
    </svg>
  );
}

const Pin = ({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <path
      d="M0 0c-9-11-14-18-14-26a14 14 0 1 1 28 0c0 8-5 15-14 26z"
      className="fill-brand-600"
    />
    <circle cy="-26" r="5.5" className="fill-white" />
  </g>
);

// 1. Welcome: a shopper's map. Your store is the pin that nearby shoppers find.
export function WelcomeScene() {
  return (
    <Scene label="A map where nearby shoppers find your store">
      <rect
        x="20"
        y="20"
        width="280"
        height="180"
        rx="18"
        className="fill-white stroke-slate-200"
      />
      <g className="stroke-slate-200" strokeWidth="10" strokeLinecap="round">
        <path d="M20 120h280M110 20v180M220 60v140" />
      </g>
      <g className="fill-brand-100">
        <rect x="128" y="34" width="70" height="40" rx="8" />
        <rect x="40" y="136" width="56" height="44" rx="8" />
        <rect x="236" y="136" width="48" height="44" rx="8" />
      </g>
      {[0, 0.7, 1.4].map((begin) => (
        <circle
          key={begin}
          cx="160"
          cy="124"
          r="10"
          fill="none"
          className="stroke-brand-500"
          strokeWidth="2"
        >
          <animate
            attributeName="r"
            values="10;52"
            dur="2.1s"
            begin={`${begin}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.7;0"
            dur="2.1s"
            begin={`${begin}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}
      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 0;0 -6;0 0"
          dur="1.8s"
          repeatCount="indefinite"
        />
        <Pin x={160} y={126} scale={1.5} />
      </g>
      {[
        [64, 70],
        [252, 92],
        [236, 40],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="11" className="fill-amber-400" />
          <circle cx={x} cy={y} r="4" className="fill-white" />
          <animate
            attributeName="opacity"
            values="0.35;1;0.35"
            dur="2.4s"
            begin={`${i * 0.5}s`}
            repeatCount="indefinite"
          />
        </g>
      ))}
    </Scene>
  );
}

// 2. Store profile: a shop front with its address pin and opening hours clock.
export function StoreScene() {
  return (
    <Scene label="A shop front with its location and opening hours">
      <rect
        x="60"
        y="92"
        width="200"
        height="104"
        rx="6"
        className="fill-white stroke-slate-300"
      />
      {Array.from({ length: 8 }, (_, i) => (
        <rect
          key={i}
          x={60 + i * 25}
          y="66"
          width="25"
          height="30"
          className={i % 2 ? "fill-brand-200" : "fill-brand-600"}
        />
      ))}
      <rect
        x="60"
        y="92"
        width="200"
        height="6"
        className="fill-brand-700"
        opacity="0.35"
      />
      <rect
        x="112"
        y="108"
        width="96"
        height="22"
        rx="5"
        className="fill-slate-100 stroke-slate-200"
      />
      <rect
        x="124"
        y="116"
        width="72"
        height="6"
        rx="3"
        className="fill-slate-300"
      />
      <rect
        x="80"
        y="144"
        width="62"
        height="52"
        rx="4"
        className="fill-brand-100"
      />
      <rect
        x="170"
        y="144"
        width="70"
        height="52"
        rx="4"
        className="fill-slate-100 stroke-slate-300"
      />
      <circle cx="226" cy="172" r="3" className="fill-brand-600" />
      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 0;0 -7;0 0"
          dur="2s"
          repeatCount="indefinite"
        />
        <Pin x={160} y={56} scale={1.1} />
      </g>
      <g transform="translate(262 40)">
        <circle
          r="22"
          className="fill-white stroke-brand-500"
          strokeWidth="3"
        />
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="-12"
          className="stroke-slate-700"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <line
          x1="0"
          y1="0"
          x2="9"
          y2="4"
          className="stroke-brand-600"
          strokeWidth="3"
          strokeLinecap="round"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="0;360"
            dur="6s"
            repeatCount="indefinite"
          />
        </line>
      </g>
    </Scene>
  );
}

// 3. Add products: product cards pop up, a "+" invites the first one, a CSV sheet slides in.
export function ProductsScene() {
  const cards = [
    { x: 30, delay: 0, tint: "fill-brand-100" },
    { x: 118, delay: 0.5, tint: "fill-amber-100" },
    { x: 206, delay: 1, tint: "fill-emerald-100" },
  ];
  return (
    <Scene label="Product cards appearing, with an add button and a CSV file">
      {cards.map((c) => (
        <g key={c.x}>
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0 10;0 0;0 0;0 10"
            keyTimes="0;0.2;0.85;1"
            dur="4s"
            begin={`${c.delay}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0;1;1;0"
            keyTimes="0;0.2;0.85;1"
            dur="4s"
            begin={`${c.delay}s`}
            repeatCount="indefinite"
          />
          <rect
            x={c.x}
            y="40"
            width="84"
            height="116"
            rx="10"
            className="fill-white stroke-slate-200"
          />
          <rect
            x={c.x + 8}
            y="48"
            width="68"
            height="56"
            rx="6"
            className={c.tint}
          />
          <circle
            cx={c.x + 42}
            cy="76"
            r="14"
            className="fill-white"
            opacity="0.8"
          />
          <rect
            x={c.x + 8}
            y="112"
            width="48"
            height="6"
            rx="3"
            className="fill-slate-300"
          />
          <rect
            x={c.x + 8}
            y="126"
            width="30"
            height="8"
            rx="4"
            className="fill-slate-700"
          />
          <rect
            x={c.x + 46}
            y="124"
            width="30"
            height="14"
            rx="7"
            className="fill-brand-600"
          />
        </g>
      ))}
      <g>
        <circle cx="262" cy="176" r="18" className="fill-brand-600">
          <animate
            attributeName="r"
            values="18;21;18"
            dur="1.6s"
            repeatCount="indefinite"
          />
        </circle>
        <path
          d="M262 168v16M254 176h16"
          className="stroke-white"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </g>
      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="-30 0;0 0;0 0;-30 0"
          keyTimes="0;0.25;0.8;1"
          dur="4s"
          repeatCount="indefinite"
        />
        <rect
          x="30"
          y="168"
          width="96"
          height="34"
          rx="8"
          className="fill-white stroke-slate-300"
        />
        <rect
          x="40"
          y="176"
          width="30"
          height="18"
          rx="3"
          className="fill-emerald-500"
        />
        <text
          x="55"
          y="189"
          textAnchor="middle"
          fontSize="9"
          fontWeight="700"
          className="fill-white"
        >
          CSV
        </text>
        <rect
          x="78"
          y="178"
          width="38"
          height="5"
          rx="2.5"
          className="fill-slate-300"
        />
        <rect
          x="78"
          y="188"
          width="26"
          height="5"
          rx="2.5"
          className="fill-slate-200"
        />
      </g>
    </Scene>
  );
}

// 4. Visibility: a switch flips between Draft (hidden) and Published (visible to shoppers).
export function VisibilityScene() {
  return (
    <Scene label="A switch turning a product from draft to published">
      <rect
        x="40"
        y="46"
        width="240"
        height="64"
        rx="14"
        className="fill-white stroke-slate-200"
      />
      <rect
        x="54"
        y="58"
        width="40"
        height="40"
        rx="8"
        className="fill-brand-100"
      />
      <rect
        x="106"
        y="62"
        width="80"
        height="8"
        rx="4"
        className="fill-slate-700"
      />
      <rect
        x="106"
        y="78"
        width="52"
        height="7"
        rx="3.5"
        className="fill-slate-300"
      />
      <g transform="translate(222 68)">
        <rect width="46" height="26" rx="13" className="fill-slate-300" />
        <rect width="46" height="26" rx="13" className="fill-brand-600">
          <animate
            attributeName="opacity"
            values="0;1;1;0"
            keyTimes="0;0.2;0.8;1"
            dur="4s"
            repeatCount="indefinite"
          />
        </rect>
        <circle cx="13" cy="13" r="10" className="fill-white">
          <animate
            attributeName="cx"
            values="13;33;33;13"
            keyTimes="0;0.2;0.8;1"
            dur="4s"
            repeatCount="indefinite"
          />
        </circle>
      </g>
      <g>
        <rect
          x="54"
          y="124"
          width="92"
          height="28"
          rx="14"
          className="fill-amber-100 stroke-amber-400"
        />
        <text
          x="100"
          y="142"
          textAnchor="middle"
          fontSize="12"
          fontWeight="700"
          className="fill-amber-900"
        >
          Draft
        </text>
        <animate
          attributeName="opacity"
          values="1;0.25;0.25;1"
          keyTimes="0;0.2;0.8;1"
          dur="4s"
          repeatCount="indefinite"
        />
      </g>
      <g>
        <rect
          x="158"
          y="124"
          width="108"
          height="28"
          rx="14"
          className="fill-emerald-100 stroke-emerald-500"
        />
        <text
          x="212"
          y="142"
          textAnchor="middle"
          fontSize="12"
          fontWeight="700"
          className="fill-emerald-800"
        >
          Published
        </text>
        <animate
          attributeName="opacity"
          values="0.25;1;1;0.25"
          keyTimes="0;0.2;0.8;1"
          dur="4s"
          repeatCount="indefinite"
        />
      </g>
      <g
        className="stroke-slate-500"
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M120 188c14-22 66-22 80 0-14 22-66 22-80 0z" />
        <circle cx="160" cy="188" r="7" />
        <animate
          attributeName="opacity"
          values="0.3;1;1;0.3"
          keyTimes="0;0.2;0.8;1"
          dur="4s"
          repeatCount="indefinite"
        />
      </g>
    </Scene>
  );
}

// 5. Keep it fresh: a ring counts down to "needs verification"; one tap fills it again.
export function FreshScene() {
  return (
    <Scene label="A freshness ring that is refilled when you confirm stock">
      <circle
        cx="160"
        cy="108"
        r="58"
        fill="none"
        className="stroke-slate-200"
        strokeWidth="14"
      />
      <circle
        cx="160"
        cy="108"
        r="58"
        fill="none"
        className="stroke-brand-600"
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray="364.4"
        transform="rotate(-90 160 108)"
      >
        <animate
          attributeName="stroke-dashoffset"
          values="364.4;0;0;364.4"
          keyTimes="0;0.45;0.85;1"
          dur="4.5s"
          repeatCount="indefinite"
        />
      </circle>
      <g>
        <circle cx="160" cy="108" r="30" className="fill-emerald-500" />
        <path
          d="M146 109l10 10 19-21"
          fill="none"
          className="stroke-white"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <animate
          attributeName="opacity"
          values="0;0;1;1;0"
          keyTimes="0;0.35;0.5;0.85;1"
          dur="4.5s"
          repeatCount="indefinite"
        />
      </g>
      <g>
        <circle cx="160" cy="108" r="30" className="fill-amber-400" />
        <text
          x="160"
          y="104"
          textAnchor="middle"
          fontSize="20"
          fontWeight="800"
          className="fill-white"
        >
          30
        </text>
        <text
          x="160"
          y="120"
          textAnchor="middle"
          fontSize="10"
          fontWeight="700"
          className="fill-white"
        >
          DAYS
        </text>
        <animate
          attributeName="opacity"
          values="1;1;0;0;1"
          keyTimes="0;0.35;0.5;0.85;1"
          dur="4.5s"
          repeatCount="indefinite"
        />
      </g>
      <rect
        x="86"
        y="184"
        width="148"
        height="26"
        rx="13"
        className="fill-white stroke-brand-500"
      />
      <text
        x="160"
        y="201"
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        className="fill-brand-700"
      >
        Confirm still in stock
      </text>
    </Scene>
  );
}

// 6. Find things fast: search, category chips and the list/grid switch.
export function FindScene() {
  return (
    <Scene label="A search box, category chips and a list or grid switch">
      <rect
        x="30"
        y="26"
        width="260"
        height="36"
        rx="18"
        className="fill-white stroke-slate-300"
      />
      <circle
        cx="54"
        cy="44"
        r="7"
        fill="none"
        className="stroke-slate-500"
        strokeWidth="2.5"
      />
      <path
        d="M59 49l6 6"
        className="stroke-slate-500"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <rect
        x="76"
        y="40"
        width="0"
        height="8"
        rx="4"
        className="fill-slate-700"
      >
        <animate
          attributeName="width"
          values="0;96;96;0"
          keyTimes="0;0.5;0.9;1"
          dur="4s"
          repeatCount="indefinite"
        />
      </rect>
      {[
        { x: 30, w: 44, label: "All" },
        { x: 82, w: 62, label: "Dairy" },
        { x: 152, w: 66, label: "Bakery" },
        { x: 226, w: 64, label: "Drinks" },
      ].map((chip, i) => (
        <g key={chip.label}>
          <rect
            x={chip.x}
            y="78"
            width={chip.w}
            height="24"
            rx="12"
            className="fill-white stroke-slate-300"
          />
          <rect
            x={chip.x}
            y="78"
            width={chip.w}
            height="24"
            rx="12"
            className="fill-brand-600"
          >
            <animate
              attributeName="opacity"
              values="0;1;0"
              keyTimes="0;0.5;1"
              dur={`${3 + i * 0.4}s`}
              repeatCount="indefinite"
            />
          </rect>
          <text
            x={chip.x + chip.w / 2}
            y="94"
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            className="fill-slate-700"
          >
            {chip.label}
            <animate
              attributeName="opacity"
              values="1;0;1"
              keyTimes="0;0.5;1"
              dur={`${3 + i * 0.4}s`}
              repeatCount="indefinite"
            />
          </text>
          <text
            x={chip.x + chip.w / 2}
            y="94"
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            className="fill-white"
          >
            {chip.label}
            <animate
              attributeName="opacity"
              values="0;1;0"
              keyTimes="0;0.5;1"
              dur={`${3 + i * 0.4}s`}
              repeatCount="indefinite"
            />
          </text>
        </g>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect
            x={30 + i * 66}
            y="118"
            width="58"
            height="82"
            rx="9"
            className="fill-white stroke-slate-200"
          />
          <rect
            x={36 + i * 66}
            y="124"
            width="46"
            height="40"
            rx="5"
            className={
              [
                "fill-brand-100",
                "fill-amber-100",
                "fill-emerald-100",
                "fill-slate-100",
              ][i]
            }
          />
          <rect
            x={36 + i * 66}
            y="172"
            width="34"
            height="6"
            rx="3"
            className="fill-slate-300"
          />
          <rect
            x={36 + i * 66}
            y="184"
            width="20"
            height="7"
            rx="3.5"
            className="fill-slate-700"
          />
          <animate
            attributeName="opacity"
            values="1;0.55;1"
            dur="3s"
            begin={`${i * 0.4}s`}
            repeatCount="indefinite"
          />
        </g>
      ))}
    </Scene>
  );
}

// 7. All set: a big tick with confetti.
export function DoneScene() {
  const confetti = [
    { x: 70, c: "fill-amber-400", d: 0 },
    { x: 110, c: "fill-brand-500", d: 0.4 },
    { x: 150, c: "fill-emerald-500", d: 0.8 },
    { x: 190, c: "fill-pink-400", d: 0.2 },
    { x: 230, c: "fill-amber-400", d: 0.6 },
    { x: 260, c: "fill-brand-500", d: 1 },
    { x: 90, c: "fill-pink-400", d: 1.2 },
    { x: 215, c: "fill-emerald-500", d: 1.4 },
  ];
  return (
    <Scene label="A big tick with confetti">
      {confetti.map((p, i) => (
        <rect
          key={i}
          x={p.x}
          y="30"
          width="8"
          height="12"
          rx="2"
          className={p.c}
        >
          <animate
            attributeName="y"
            values="190;30"
            dur="2.6s"
            begin={`${p.d}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0;1;0"
            dur="2.6s"
            begin={`${p.d}s`}
            repeatCount="indefinite"
          />
        </rect>
      ))}
      <g transform="translate(160 112)">
        <circle r="56" className="fill-emerald-500">
          <animate
            attributeName="r"
            values="0;62;56"
            keyTimes="0;0.6;1"
            dur="0.7s"
            fill="freeze"
          />
        </circle>
        <path
          d="M-24 2l16 16 32-36"
          fill="none"
          className="stroke-white"
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="90"
          strokeDashoffset="90"
        >
          <animate
            attributeName="stroke-dashoffset"
            values="90;0"
            dur="0.5s"
            begin="0.5s"
            fill="freeze"
          />
        </path>
      </g>
    </Scene>
  );
}
