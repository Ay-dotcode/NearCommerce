import iconUrl from "@nearcommerce/ui/public/icon.svg";

// The NearCommerce app icon. The single source file lives in packages/ui/public/icon.svg and is
// also served as the favicon by the web and admin apps.
export function BrandIcon({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={iconUrl}
      alt=""
      width={size}
      height={size}
      className={className}
      draggable={false}
    />
  );
}
