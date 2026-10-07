import AuditLogs from "@/pages/AuditLogs";
import { apiClient } from "@nearcommerce/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

jest.mock("@nearcommerce/api", () => ({
  ...jest.requireActual("@nearcommerce/api"),
  apiClient: { get: jest.fn() },
}));
const get = apiClient.get as jest.Mock;

const log = {
  id: "l1",
  admin_id: "a1",
  admin_email: "root@nearcommerce.test",
  action: "DELETE_STORE",
  target_id: "s1",
  target_type: "STORE",
  reason: "Fraud",
  snapshot: { name: "Corner Market" },
  created_at: "2026-01-01T00:00:00Z",
};

const renderPage = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <AuditLogs />
    </QueryClientProvider>,
  );

describe("Admin audit logs", () => {
  it("shows who acted, the reason and the pre-mutation snapshot", async () => {
    get.mockResolvedValue({
      data: { data: [log], pagination: { page: 1, limit: 50, total: 1 } },
    });
    renderPage();
    expect(await screen.findByText("DELETE_STORE")).toBeInTheDocument();
    expect(screen.getByText("root@nearcommerce.test")).toBeInTheDocument();
    expect(screen.getByText("Fraud")).toBeInTheDocument();
    expect(screen.getByText(/Corner Market/)).toBeInTheDocument();
  });

  it("can reach events beyond the first page", async () => {
    get.mockResolvedValue({
      data: { data: [log], pagination: { page: 1, limit: 50, total: 120 } },
    });
    renderPage();
    expect(await screen.findByText(/Page 1 of 3/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(get).toHaveBeenLastCalledWith("/admin/audit-logs?page=2&limit=50"),
    );
  });
});
