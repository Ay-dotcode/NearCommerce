import { POSTAL_CODE_PATTERN } from "@/constants";
import * as Yup from "yup";

export const zipInitialValues = { code: "" };

// Why a lookup failed, in plain language (keyed by PostalCodeError.reason).
export const ZIP_MESSAGES: Record<string, string> = {
  invalid: "Enter a valid ZIP or postal code.",
  not_found: "We couldn't find that ZIP code. Check it and try again.",
  unavailable: "Couldn't look up that code. Check your connection.",
};

export const zipSchema = Yup.object({
  code: Yup.string()
    .trim()
    .matches(POSTAL_CODE_PATTERN, ZIP_MESSAGES.invalid)
    .required(ZIP_MESSAGES.invalid),
});
