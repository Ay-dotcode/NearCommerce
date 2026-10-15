import { cn } from "@nearcommerce/helpers";
import {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  forwardRef,
  useId,
} from "react";
import { controlClass, describedBy } from "@nearcommerce/ui/src/helpers/field";

interface FieldShellProps {
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  // Keep the label for screen readers but do not show it (compact filter bars).
  hideLabel?: boolean;
}

function Shell({
  id,
  label,
  hint,
  error,
  required,
  className,
  hideLabel,
  children,
}: FieldShellProps & { id: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={cn(
          "block text-sm font-medium text-slate-700",
          hideLabel ? "sr-only" : "mb-1",
        )}
      >
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-red-600">
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1 text-sm text-red-600"
        >
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-sm text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export type TextFieldProps = FieldShellProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "className">;

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, hint, error, required, className, hideLabel, id: idProp, ...rest }, ref) => {
    const generated = useId();
    const id = idProp ?? generated;
    return (
      <Shell {...{ id, label, hint, error, required, className, hideLabel }}>
        <input
          ref={ref}
          id={id}
          aria-required={required || undefined}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy(id, error, hint)}
          className={controlClass(Boolean(error))}
          {...rest}
        />
      </Shell>
    );
  },
);
TextField.displayName = "TextField";

export type TextAreaFieldProps = FieldShellProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className">;

export const TextAreaField = forwardRef<
  HTMLTextAreaElement,
  TextAreaFieldProps
>(({ label, hint, error, required, className, hideLabel, id: idProp, ...rest }, ref) => {
  const generated = useId();
  const id = idProp ?? generated;
  return (
    <Shell {...{ id, label, hint, error, required, className, hideLabel }}>
      <textarea
        ref={ref}
        id={id}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={controlClass(Boolean(error))}
        {...rest}
      />
    </Shell>
  );
});
TextAreaField.displayName = "TextAreaField";

export type SelectFieldProps = FieldShellProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "className">;

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  (
    { label, hint, error, required, className, hideLabel, id: idProp, children, ...rest },
    ref,
  ) => {
    const generated = useId();
    const id = idProp ?? generated;
    return (
      <Shell {...{ id, label, hint, error, required, className, hideLabel }}>
        <select
          ref={ref}
          id={id}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy(id, error, hint)}
          className={controlClass(Boolean(error))}
          {...rest}
        >
          {children}
        </select>
      </Shell>
    );
  },
);
SelectField.displayName = "SelectField";
