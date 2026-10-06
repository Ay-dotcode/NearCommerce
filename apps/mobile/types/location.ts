export type Coords = { latitude: number; longitude: number };
export type ManualLocation = Coords & { postalCode: string };

export type PostalCodeErrorReason = "invalid" | "not_found" | "unavailable";

export class PostalCodeError extends Error {
  constructor(public reason: PostalCodeErrorReason) {
    super(reason);
  }
}
