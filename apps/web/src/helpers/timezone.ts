// The shopper's own timezone, used as the default for a new store.
export const browserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

// Every timezone the browser knows (with a short fallback list on old browsers).
export const listTimezones = (): string[] => {
  try {
    return (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone");
  } catch {
    return ["UTC", "Europe/London", "America/New_York", "Asia/Tokyo"];
  }
};
