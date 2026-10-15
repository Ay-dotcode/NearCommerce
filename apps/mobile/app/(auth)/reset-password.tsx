import AuthScreen from "@/components/auth/AuthScreen";
import { ResetPasswordForm } from "@/forms/ResetPasswordForm";

export default function ResetPasswordScreen() {
  return (
    <AuthScreen title="Choose a new password">
      <ResetPasswordForm />
    </AuthScreen>
  );
}
