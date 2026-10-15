import AuthScreen from "@/components/auth/AuthScreen";
import { RegisterForm } from "@/forms/RegisterForm";

export default function RegisterScreen() {
  return (
    <AuthScreen
      title="Create account"
      subtitle="Discover local stores and plan shopping trips."
    >
      <RegisterForm />
    </AuthScreen>
  );
}
