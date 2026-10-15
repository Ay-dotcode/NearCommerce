import AuthScreen from "@/components/auth/AuthScreen";
import { LoginForm } from "@/forms/LoginForm";

export default function LoginScreen() {
  return (
    <AuthScreen
      title="Welcome back"
      subtitle="Sign in to discover local stores and products."
    >
      <LoginForm />
    </AuthScreen>
  );
}
