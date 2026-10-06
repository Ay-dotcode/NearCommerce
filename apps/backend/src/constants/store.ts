export const MAX_STORES_PER_OWNER = 10;
export const STORE_KEY = "x-store-id";

export const ALWAYS_OPEN = Object.fromEntries(
  [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ].map((day) => [day, { open: "00:00", close: "23:59" }]),
);

export const OPEN_WEEK = {
  monday: { open: "09:00", close: "18:00" },
  sunday: { open: "00:00", close: "00:00", closed: true },
};
