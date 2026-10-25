import { cn } from "@nearcommerce/helpers";
import { useField } from "formik";
import type { ReactNode } from "react";
import {
  PasswordField,
  PasswordFieldProps,
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

export function FormPasswordField({
  name,
  error,
  onChange,
  ...rest
}: Bound<PasswordFieldProps>) {
  const [field, meta] = useField(name);
  return (
    <PasswordField
      {...field}
      {...rest}
      onChange={onChange ?? field.onChange}
      error={error ?? (meta.touched ? meta.error : undefined)}
    />
  );
}

// Wraps the controls of a <form>. While `busy` (the form is submitting) every input, select,
// checkbox and button inside is disabled by the browser, so nothing can be edited or sent twice.
// Layout classes (such as space-y-4) go on this element, not on the <form>.
export function BusyFieldset({
  busy,
  className,
  children,
}: {
  busy: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <fieldset
      disabled={busy}
      aria-busy={busy || undefined}
      className={cn("m-0 min-w-0 border-0 p-0", className)}
    >
      {children}
    </fieldset>
  );
}
