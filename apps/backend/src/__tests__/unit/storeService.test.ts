import {
  isValidTimezone,
  normalizeOpeningHours,
} from "@/services/store.service";
import { CreateStoreSchema, UpdateStoreSchema } from "@nearcommerce/api";

const validStore = {
  name: "Corner Market",
  address: "12 Main Street, Nicosia",
  latitude: 35.17,
  longitude: 33.36,
  timezone: "Asia/Nicosia",
  openingHours: { monday: { open: "09:00", close: "18:00" } },
};

describe("normalizeOpeningHours", () => {
  it("collapses the legacy `closed` flag into `isClosed`", () => {
    const result = normalizeOpeningHours({
      monday: { open: "09:00", close: "17:00", closed: true },
      tuesday: { open: "09:00", close: "17:00", isClosed: false },
      wednesday: null,
    });
    expect(result.monday).toEqual({
      open: "09:00",
      close: "17:00",
      isClosed: true,
    });
    expect(result.tuesday).toEqual({
      open: "09:00",
      close: "17:00",
      isClosed: false,
    });
    expect(result.wednesday).toBeNull();
  });

  it("does not invent days that were not provided", () => {
    expect(Object.keys(normalizeOpeningHours({ friday: null }))).toEqual([
      "friday",
    ]);
  });
});

describe("isValidTimezone", () => {
  it.each(["UTC", "Europe/London", "Asia/Nicosia"])("accepts %s", (tz) =>
    expect(isValidTimezone(tz)).toBe(true),
  );
  it.each(["Mars/Olympus", "", "not a zone"])("rejects %p", (tz) =>
    expect(isValidTimezone(tz)).toBe(false),
  );
});

describe("CreateStoreSchema", () => {
  it("accepts a valid store and defaults timezone to UTC", () => {
    const { timezone: _tz, ...withoutTz } = validStore;
    const parsed = CreateStoreSchema.safeParse(withoutTz);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.timezone).toBe("UTC");
  });

  it("requires openingHours (camelCase)", () => {
    const { openingHours: _oh, ...rest } = validStore;
    expect(CreateStoreSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects closing times that are not after opening times", () => {
    const parsed = CreateStoreSchema.safeParse({
      ...validStore,
      openingHours: { monday: { open: "18:00", close: "09:00" } },
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success)
      expect(parsed.error.issues[0].message).toMatch(/after opening/);
  });

  it("ignores the time order on days marked closed", () => {
    const parsed = CreateStoreSchema.safeParse({
      ...validStore,
      openingHours: { sunday: { open: "00:00", close: "00:00", closed: true } },
    });
    expect(parsed.success).toBe(true);
  });

  it.each([
    ["latitude", { latitude: 120 }],
    ["longitude", { longitude: -200 }],
    ["name", { name: "A" }],
    ["address", { address: "x" }],
  ])("rejects an invalid %s", (_field, patch) =>
    expect(
      CreateStoreSchema.safeParse({ ...validStore, ...patch }).success,
    ).toBe(false),
  );
});

describe("UpdateStoreSchema", () => {
  it("accepts a partial update", () => {
    expect(UpdateStoreSchema.safeParse({ name: "New name" }).success).toBe(
      true,
    );
  });
  it("rejects an empty body", () => {
    expect(UpdateStoreSchema.safeParse({}).success).toBe(false);
  });
  it("allows clearing the description with null", () => {
    expect(UpdateStoreSchema.safeParse({ description: null }).success).toBe(
      true,
    );
  });
});
