import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react-native";
import { createElement, type ReactElement } from "react";

export function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
  // Cast: the workspace has two @types/react copies, which makes JSX element types incompatible.
  return render(createElement(QueryClientProvider, { client }, ui) as never);
}

// Route a mocked apiClient.get by URL so tests don't depend on call order.
export function serveGet(
  get: jest.Mock,
  routes: Record<string, unknown | (() => unknown)>,
) {
  get.mockImplementation(async (url: string) => {
    const hit = routes[url];
    if (hit === undefined) throw new Error(`Unmocked GET ${url}`);
    return { data: typeof hit === "function" ? (hit as () => unknown)() : hit };
  });
}
