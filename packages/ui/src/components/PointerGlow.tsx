import { useEffect, useRef, type CSSProperties } from "react";

// Decorative page background: a faint dot grid, two slowly drifting colour blobs and a soft glow
// that follows the mouse. It sits behind everything (-z-10, no pointer events), so content needs
// no background of its own on the page wrapper. On touch screens and for people who prefer
// reduced motion the glow stays at rest near the top of the page.
export function PointerGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const idle = window.matchMedia?.(
      "(pointer: coarse), (prefers-reduced-motion: reduce)",
    ).matches;
    if (idle) return;

    let frame = 0;
    let x = 0;
    let y = 0;
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      // One style write per frame, however fast the mouse moves.
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0;
          el.style.setProperty("--mx", `${x}px`);
          el.style.setProperty("--my", `${y}px`);
        });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-testid="pointer-glow"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ "--mx": "50%", "--my": "16%" } as CSSProperties}
    >
      <div className="absolute -left-32 -top-32 h-96 w-96 animate-drift rounded-full bg-brand-400/20 blur-3xl" />
      <div className="absolute -right-24 top-1/3 h-80 w-80 animate-drift rounded-full bg-emerald-400/15 blur-3xl [animation-delay:-8s]" />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(rgb(var(--c-slate-300) / 0.6) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          maskImage: "radial-gradient(ellipse at top, black, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at top, black, transparent 80%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(480px circle at var(--mx) var(--my), rgb(var(--c-brand-500) / 0.2), transparent 62%)",
        }}
      />
    </div>
  );
}
