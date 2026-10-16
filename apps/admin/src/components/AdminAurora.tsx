// The admin console's signature backdrop: slowly shifting bands of violet light with a fine
// grid, behind everything (no pointer events). Static for people who prefer reduced motion.
export function AdminAurora() {
  return (
    <div
      aria-hidden="true"
      data-testid="admin-aurora"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute -top-1/3 left-1/4 h-[60vh] w-[70vw] animate-aurora rounded-full bg-gradient-to-r from-brand-500/25 via-brand-300/20 to-emerald-400/15 blur-3xl motion-reduce:animate-none" />
      <div className="absolute -right-1/4 top-1/3 h-[50vh] w-[55vw] animate-aurora rounded-full bg-gradient-to-l from-brand-400/20 to-amber-300/10 blur-3xl [animation-delay:-11s] motion-reduce:animate-none" />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgb(var(--c-slate-300) / 0.35) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--c-slate-300) / 0.35) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse at top, black, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at top, black, transparent 75%)",
        }}
      />
    </div>
  );
}
