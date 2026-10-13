import { AppRouter } from "@/app/router";
import { ToastProvider } from "@nearcommerce/ui";
import { restoreSession } from "@/features/auth/session";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export default function App() {
  restoreSession();

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AppRouter />
      </ToastProvider>
    </QueryClientProvider>
  );
}
