import { useField } from "formik";
import {
  SelectField,
  SelectFieldProps,
  TextAreaField,
  TextAreaFieldProps,
  TextField,
  TextFieldProps,
} from "./Field";

type Bound<P extends { onChange?: unknown }> = Omit<
  P,
  "name" | "value" | "onBlur" | "error"
> & {
  name: string;
  // Replaces the validation error (for example a server-side message).
  error?: string;
};

// Formik-aware inputs: they read value/blur/change from the surrounding <Formik> form and show
// the validation error once the field has been touched, so forms stay declarative.
export function FormTextField({
  name,
  error,
  onChange,
  ...rest
}: Bound<TextFieldProps>) {
  const [field, meta] = useField(name);
  return (
    <TextField
      {...field}
      {...rest}
      onChange={onChange ?? field.onChange}
      error={error ?? (meta.touched ? meta.error : undefined)}
    />
  );
}

export function FormTextAreaField({
  name,
  error,
  onChange,
  ...rest
}: Bound<TextAreaFieldProps>) {
  const [field, meta] = useField(name);
  return (
    <TextAreaField
      {...field}
      {...rest}
      onChange={onChange ?? field.onChange}
      error={error ?? (meta.touched ? meta.error : undefined)}
    />
  );
}

export function FormSelectField({
  name,
  error,
  onChange,
  ...rest
}: Bound<SelectFieldProps>) {
  const [field, meta] = useField(name);
  return (
    <SelectField
      {...field}
      {...rest}
      onChange={onChange ?? field.onChange}
      error={error ?? (meta.touched ? meta.error : undefined)}
    />
  );
}
