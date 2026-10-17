import { cn } from "@nearcommerce/helpers";
import type { ReactNode } from "react";

// Animates a page in whenever `transitionKey` changes (pass the route path): the new page
// slides in a little from the right while fading in. Motion is skipped for people who ask for
// reduced motion. Wrap the router <Outlet /> with it once per layout.
export function PageTransition({
  transitionKey,
  children,
  className,
}: {
  transitionKey: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      key={transitionKey}
      data-testid="page-transition"
      className={cn("animate-page-in motion-reduce:animate-none", className)}
    >
      {children}
    </div>
  );
}
