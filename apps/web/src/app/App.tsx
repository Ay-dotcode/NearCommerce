import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRouter } from './router';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRouter />
    </QueryClientProvider>
  );
}
