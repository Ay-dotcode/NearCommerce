import { useField } from "formik";
import { TextField, type TextFieldProps } from "./TextField";

type Props = Omit<
  TextFieldProps,
  "value" | "onChangeText" | "onBlur" | "error"
> & {
  name: string;
  // Replaces the validation error (for example a message from the server).
  error?: string;
};

// Formik-bound TextField: value, change and blur come from the surrounding <Formik>, and the
// error shows inline once the field has been touched.
export function FormTextField({ name, error, ...rest }: Props) {
  const [field, meta, helpers] = useField<string>(name);
  return (
    <TextField
      {...rest}
      value={field.value}
      onChangeText={(text) => helpers.setValue(text)}
      onBlur={() => helpers.setTouched(true)}
      error={error ?? (meta.touched ? meta.error : undefined)}
    />
  );
}
