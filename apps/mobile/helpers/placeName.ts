// Turns a reverse-geocoding result into a short place name like "Nicosia, Cyprus".
export interface AddressParts {
  city?: string | null;
  district?: string | null;
  subregion?: string | null;
  region?: string | null;
  country?: string | null;
  name?: string | null;
}

export function formatPlaceName(address: AddressParts | undefined): string | null {
  if (!address) return null;
  const locality =
    address.city || address.district || address.subregion || address.region || address.name;
  const area = locality
    ? address.country && address.country !== locality
      ? address.country
      : null
    : address.country;
  const parts = [locality, area].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(", ") : null;
}
