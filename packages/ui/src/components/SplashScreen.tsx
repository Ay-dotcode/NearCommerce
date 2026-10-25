import { ReactNode, useEffect, useRef, useState } from "react";
import { BrandIcon } from "./BrandIcon";

interface Props {
  // Name shown under the logo, e.g. "Near Commerce".
  title: string;
  // Small line under the name, e.g. "Store Owner Portal".
  subtitle?: string;
  // How long the animation plays before it fades away.
  durationMs?: number;
  // The app. It renders (and starts loading) underneath the animation right away.
  children: ReactNode;
}

const SEEN_KEY = "nc-splash-seen";
const EXIT_MS = 350;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Whether this browser tab already played the animation. Storage can be blocked, in which case
// the animation simply plays on every load.
function alreadySeen(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

// Opening animation: the logo springs in with ripples around it and a progress line, then the
// whole screen fades out. It plays once per browser tab session, is shortened for people who
// ask for reduced motion, and keeps the page underneath unreachable (inert) while it plays.
export function SplashScreen({
  title,
  subtitle,
  durationMs = 1900,
  children,
}: Props) {
  const [phase, setPhase] = useState<"playing" | "leaving" | "done">(() =>
    alreadySeen() ? "done" : "playing",
  );
  const appRef = useRef<HTMLDivElement>(null);
  const duration = prefersReducedMotion() ? 500 : durationMs;

  useEffect(() => {
    if (phase !== "playing") return;
    const leave = setTimeout(() => setPhase("leaving"), duration);
    return () => clearTimeout(leave);
  }, [phase, duration]);

  useEffect(() => {
    if (phase !== "leaving") return;
    const done = setTimeout(() => {
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        // Not remembered; the animation will play again on the next load.
      }
      setPhase("done");
    }, EXIT_MS);
    return () => clearTimeout(done);
  }, [phase]);

  // Keyboard users must not be able to tab into the app while it is covered.
  useEffect(() => {
    const el = appRef.current;
    if (!el) return;
    if (phase === "done") el.removeAttribute("inert");
    else el.setAttribute("inert", "");
  }, [phase]);

  return (
    <>
      <div ref={appRef}>{children}</div>
      {phase !== "done" && (
        <div
          role="status"
          aria-label={`Loading ${title}`}
          style={{ ["--splash-ms" as string]: `${duration}ms` }}
          className={
            "fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-slate-50 " +
            (phase === "leaving" ? "animate-splash-out" : "")
          }
        >
          {/* Soft brand glow behind everything. */}
          <div
            aria-hidden="true"
            className="absolute h-[60vmin] w-[60vmin] rounded-full bg-brand-400/20 blur-3xl"
          />
          <div className="relative flex h-40 w-40 items-center justify-center">
            {[0, 0.5, 1].map((delay) => (
              <span
                key={delay}
                aria-hidden="true"
                style={{ animationDelay: `${delay}s` }}
                className="absolute h-24 w-24 animate-splash-ring rounded-full border-2 border-brand-500/60 opacity-0"
              />
            ))}
            <BrandIcon
              size={96}
              className="animate-splash-logo rounded-[22%] shadow-overlay"
            />
          </div>
          <h1
            style={{ animationDelay: "0.5s" }}
            className="mt-4 animate-fade-in-up text-2xl font-semibold tracking-tight text-slate-900"
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{ animationDelay: "0.7s" }}
              className="mt-1 animate-fade-in-up text-sm font-medium text-brand-700"
            >
              {subtitle}
            </p>
          )}
          <div
            aria-hidden="true"
            className="mt-8 h-1 w-40 overflow-hidden rounded-full bg-slate-200"
          >
            <div className="h-full origin-left animate-splash-bar rounded-full bg-brand-600" />
          </div>
        </div>
      )}
    </>
  );
}
