import { useEffect, useRef } from "react";

export function useClearFieldError<Field extends string>(
  field: Field,
  value: unknown,
  error: string | undefined,
  setFieldError: (field: Field, message: string | undefined) => void,
) {
  const previous = useRef(value);
  useEffect(() => {
    if (previous.current === value) return;
    previous.current = value;
    if (error) setFieldError(field, undefined);
  }, [field, value, error, setFieldError]);
}
