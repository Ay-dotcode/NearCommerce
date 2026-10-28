import AuthScreen from "@/components/auth/AuthScreen";
import { ForgotPasswordForm } from "@/forms/ForgotPasswordForm";

export default function ForgotPasswordScreen() {
  return (
    <AuthScreen
      title="Reset your password"
      showBack
      subtitle="Password reset is disabled on this mock application."
    >
      <ForgotPasswordForm />
    </AuthScreen>
  );
}

