import { Skeleton } from "@nearcommerce/ui";
import { useEffect, useState } from "react";
import { cn } from "@nearcommerce/helpers";

// Product photo with a skeleton while it downloads and a plain placeholder when there is no
// image or it fails to load. The wrapper keeps a fixed size so nothing shifts as it loads.
export function ProductImage({
  src,
  alt,
  className,
  imgClassName,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
}) {
  const [state, setState] = useState<"loading" | "ready" | "failed">(
    src ? "loading" : "failed",
  );
  useEffect(() => setState(src ? "loading" : "failed"), [src]);

  return (
    <div className={cn("relative overflow-hidden bg-slate-100", className)}>
      {state === "loading" && (
        <Skeleton className="absolute inset-0 rounded-none" />
      )}
      {state === "failed" ? (
        <div
          role="img"
          aria-label={src ? `${alt} (image unavailable)` : `${alt} (no image)`}
          className="flex h-full w-full items-center justify-center text-xs text-slate-400"
        >
          {src ? "Image unavailable" : "No image"}
        </div>
      ) : (
        <img
          src={src ?? undefined}
          alt={alt}
          onLoad={() => setState("ready")}
          onError={() => setState("failed")}
          className={cn(
            "h-full w-full transition-opacity",
            state === "ready" ? "opacity-100" : "opacity-0",
            imgClassName,
          )}
        />
      )}
    </div>
  );
}
