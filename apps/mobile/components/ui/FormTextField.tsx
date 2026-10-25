import { useField, useFormikContext } from "formik";
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
// error shows inline once the field has been touched. While the form is submitting the input
// is locked, so nothing can be edited under a request that is already on its way.
export function FormTextField({ name, error, editable, ...rest }: Props) {
  const [field, meta, helpers] = useField<string>(name);
  const { isSubmitting } = useFormikContext();
  return (
    <TextField
      {...rest}
      editable={!isSubmitting && editable !== false}
      value={field.value}
      onChangeText={(text) => helpers.setValue(text)}
      onBlur={() => helpers.setTouched(true)}
      error={error ?? (meta.touched ? meta.error : undefined)}
    />
  );
}
