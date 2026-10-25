import { cn } from "@nearcommerce/helpers";
import {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  forwardRef,
  useId,
  useState,
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

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}

export type PasswordFieldProps = Omit<TextFieldProps, "type">;

// A password input with a show/hide button inside it. Edge and some other browsers draw their
// own reveal icon in password fields; it is hidden here so there is only ever this one button.
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ label, hint, error, required, className, hideLabel, id: idProp, ...rest }, ref) => {
    const generated = useId();
    const id = idProp ?? generated;
    const [visible, setVisible] = useState(false);
    return (
      <Shell {...{ id, label, hint, error, required, className, hideLabel }}>
        <div className="relative">
          <input
            ref={ref}
            id={id}
            type={visible ? "text" : "password"}
            aria-required={required || undefined}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={describedBy(id, error, hint)}
            className={cn(
              controlClass(Boolean(error)),
              "pr-11 [&::-ms-clear]:hidden [&::-ms-reveal]:hidden",
            )}
            {...rest}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            disabled={rest.disabled}
            className="absolute inset-y-0 right-0 flex w-10 cursor-pointer items-center justify-center rounded-r-md text-slate-500 transition-colors hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <EyeIcon off={visible} />
          </button>
        </div>
      </Shell>
    );
  },
);
PasswordField.displayName = "PasswordField";

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
