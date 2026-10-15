import * as Yup from "yup";

export const joinListInitialValues = { code: "" };

export const joinListSchema = Yup.object({
  code: Yup.string()
    .trim()
    .min(4, "Enter the full invite code.")
    .required("Enter the invite code."),
});
