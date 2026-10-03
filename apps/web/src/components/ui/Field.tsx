import { cn } from "@/lib/cn";
import {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  forwardRef,
  useId,
} from "react";

interface FieldShellProps {
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
}

const controlClass = (invalid: boolean) =>
  cn(
    "block w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 shadow-card",
    "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0",
    "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
    invalid
      ? "border-red-400 focus:border-red-500 focus:ring-red-200"
      : "border-slate-300 focus:border-brand-500 focus:ring-brand-200",
  );

function Shell({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
}: FieldShellProps & { id: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-1 block text-sm font-medium text-slate-700"
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

const describedBy = (id: string, error?: string, hint?: ReactNode) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

export type TextFieldProps = FieldShellProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "className">;

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, hint, error, required, className, id: idProp, ...rest }, ref) => {
    const generated = useId();
    const id = idProp ?? generated;
    return (
      <Shell {...{ id, label, hint, error, required, className }}>
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
>(({ label, hint, error, required, className, id: idProp, ...rest }, ref) => {
  const generated = useId();
  const id = idProp ?? generated;
  return (
    <Shell {...{ id, label, hint, error, required, className }}>
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
    { label, hint, error, required, className, id: idProp, children, ...rest },
    ref,
  ) => {
    const generated = useId();
    const id = idProp ?? generated;
    return (
      <Shell {...{ id, label, hint, error, required, className }}>
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
