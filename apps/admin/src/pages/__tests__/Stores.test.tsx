import Stores from "@/pages/Stores";
import { apiClient } from "@nearcommerce/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

jest.mock("@nearcommerce/api", () => ({
  ...jest.requireActual("@nearcommerce/api"),
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));
const get = apiClient.get as jest.Mock;
const patch = apiClient.patch as jest.Mock;
const del = apiClient.delete as jest.Mock;

const store = (over = {}) => ({
  id: "s1",
  name: "Corner Market",
  owner_id: "u1",
  owner_email: "owner@shop.test",
  is_suspended: false,
  ...over,
});

const page = (stores: unknown[], total = stores.length) => ({
  data: { data: stores, pagination: { page: 1, limit: 20, total } },
});

const renderPage = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <Stores />
    </QueryClientProvider>,
  );

const confirmWithReason = async (
  button: RegExp,
  reason = "Fraudulent listing",
) => {
  fireEvent.change(await screen.findByLabelText(/reason/i), {
    target: { value: reason },
  });
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: button }));
};

describe("Admin Stores", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    get.mockResolvedValue(page([store()]));
  });

  it("lists stores with the owner's email and status", async () => {
    renderPage();
    expect(await screen.findByText("Corner Market")).toBeInTheDocument();
    expect(screen.getByText("owner@shop.test")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("suspends a store with a written reason", async () => {
    patch.mockResolvedValue({ data: {} });
    renderPage();
    await screen.findByText("Corner Market");

    fireEvent.click(screen.getByRole("button", { name: "Suspend" }));
    await confirmWithReason(/^suspend$/i);

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/admin/stores/s1/suspend", {
        is_suspended: true,
        reason: "Fraudulent listing",
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Corner Market was suspended.",
    );
  });

  it("offers Unsuspend for a suspended store", async () => {
    get.mockResolvedValue(page([store({ is_suspended: true })]));
    renderPage();
    expect(
      await screen.findByRole("button", { name: "Unsuspend" }),
    ).toBeInTheDocument();
  });

  it("deletes a store after confirmation", async () => {
    del.mockResolvedValue({ data: {} });
    renderPage();
    await screen.findByText("Corner Market");

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await confirmWithReason(/delete store/i);

    await waitFor(() =>
      expect(del).toHaveBeenCalledWith("/admin/stores/s1", {
        data: { reason: "Fraudulent listing" },
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Corner Market was deleted.",
    );
  });

  it("does not call the API when the dialog is cancelled", async () => {
    renderPage();
    await screen.findByText("Corner Market");
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(await screen.findByRole("button", { name: /cancel/i }));
    expect(del).not.toHaveBeenCalled();
  });

  it("pages through stores", async () => {
    get.mockResolvedValue(page([store()], 45));
    renderPage();
    expect(await screen.findByText(/Page 1 of 3/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(get).toHaveBeenLastCalledWith("/admin/stores?page=2&limit=20"),
    );
  });
});
