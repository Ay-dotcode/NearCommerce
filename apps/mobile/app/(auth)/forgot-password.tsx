import AuthScreen from "@/components/auth/AuthScreen";
import { ForgotPasswordForm } from "@/forms/ForgotPasswordForm";
import { useState } from "react";

export default function ForgotPasswordScreen() {
  const [sent, setSent] = useState(false);
  return (
    <AuthScreen
      title="Reset your password"
      subtitle={
        sent
          ? undefined
          : "Enter the email you signed up with and we'll send you a reset link."
      }
    >
      <ForgotPasswordForm onSentChange={setSent} />
    </AuthScreen>
  );
}
