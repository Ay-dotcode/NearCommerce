import { defaultHours, hoursFromApi, hoursToPayload } from "@/features/stores/lib/hours";
import { WEEKDAYS } from "@nearcommerce/api";

describe("opening hours helpers", () => {
  it("defaults to weekdays 09-18, a short Saturday and a closed Sunday", () => {
    const d = defaultHours();
    expect(d.monday).toEqual({ open: "09:00", close: "18:00", isClosed: false });
    expect(d.saturday.close).toBe("16:00");
    expect(d.sunday.isClosed).toBe(true);
  });

  it("hoursFromApi shows missing and null days as closed and keeps given times", () => {
    const state = hoursFromApi({ monday: { open: "08:00", close: "12:00", isClosed: false }, tuesday: null });
    expect(state.monday).toEqual({ open: "08:00", close: "12:00", isClosed: false });
    expect(state.tuesday.isClosed).toBe(true);
    expect(state.wednesday.isClosed).toBe(true); // omitted by the API
  });

  it("hoursFromApi honours the legacy `closed` flag", () => {
    const state = hoursFromApi({ friday: { open: "09:00", close: "17:00", closed: true } as any });
    expect(state.friday.isClosed).toBe(true);
  });

  it("hoursFromApi tolerates undefined/null input", () => {
    expect(hoursFromApi(undefined).monday.isClosed).toBe(true);
    expect(hoursFromApi(null).sunday.isClosed).toBe(true);
  });

  it("hoursToPayload always sends all seven days with explicit isClosed", () => {
    const payload = hoursToPayload(defaultHours());
    expect(Object.keys(payload)).toEqual([...WEEKDAYS]);
    expect(payload.sunday.isClosed).toBe(true);
  });

  it("round-trips API -> editor -> payload", () => {
    const api = Object.fromEntries(WEEKDAYS.map((d) => [d, { open: "10:00", close: "20:00", isClosed: d === "sunday" }]));
    expect(hoursToPayload(hoursFromApi(api))).toEqual(api);
  });
});
