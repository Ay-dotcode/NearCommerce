import * as Yup from "yup";

// A single required text value (a list name, an item name).
export const inlineFormSchema = Yup.object({
  value: Yup.string().trim().required("Enter a name."),
});
