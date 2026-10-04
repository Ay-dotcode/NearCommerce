import { deleteStore, getStore, updateStore } from "@/api/stores";
import { StoreProfile } from "@/pages/owner/StoreProfile";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

jest.mock("@/api/stores", () => ({
  getStore: jest.fn(),
  updateStore: jest.fn(),
  deleteStore: jest.fn(),
}));
const getMock = getStore as jest.Mock;
const updateMock = updateStore as jest.Mock;
const deleteMock = deleteStore as jest.Mock;

const STORE = {
  id: "s1",
  name: "Corner Market",
  description: "Fresh",
  address: "12 Main Street, Nicosia",
  latitude: 35.18,
  longitude: 33.38,
  timezone: "Asia/Nicosia",
  is_suspended: false,
  updated_at: "2026-10-01T00:00:00Z",
  opening_hours: { monday: { open: "09:00", close: "18:00", isClosed: false } },
};

const renderPage = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={["/owner/profile"]}>
        <Routes>
          <Route path="/owner/profile" element={<StoreProfile />} />
          <Route path="/owner/dashboard" element={<div>Dashboard page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("StoreProfile (store settings)", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("x-store-id", "s1");
    jest.resetAllMocks();
    getMock.mockResolvedValue(STORE);
  });

  it("loads the active store into the form", async () => {
    renderPage();
    expect(await screen.findByLabelText(/Store name/)).toHaveValue(
      "Corner Market",
    );
    expect(getMock).toHaveBeenCalledWith("s1");
    expect(screen.getByLabelText(/Timezone/)).toHaveValue("Asia/Nicosia");
  });

  it("saves edits using the PATCH payload and confirms", async () => {
    updateMock.mockResolvedValue({ ...STORE, name: "Corner Market 2" });
    renderPage();
    fireEvent.change(await screen.findByLabelText(/Store name/), {
      target: { value: "Corner Market 2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith(
        "s1",
        expect.objectContaining({ name: "Corner Market 2" }),
      ),
    );
    expect(updateMock.mock.calls[0][1]).toHaveProperty("openingHours");
  });

  it("shows a retry when the store cannot be loaded", async () => {
    getMock
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(STORE);
    renderPage();
    expect(
      await screen.findByText("We couldn't load this store."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByLabelText(/Store name/)).toBeInTheDocument();
  });

  it("tells the user when no store is selected", () => {
    localStorage.clear();
    renderPage();
    expect(screen.getByText("No store is selected.")).toBeInTheDocument();
    expect(getMock).not.toHaveBeenCalled();
  });

  describe("delete store", () => {
    const openDialog = async () => {
      renderPage();
      await screen.findByLabelText(/Store name/);
      fireEvent.click(
        screen.getAllByRole("button", { name: "Delete store" })[0],
      );
      return screen.getByRole("dialog", { name: "Delete Corner Market?" });
    };

    it("requires typing the store name, then deletes, clears the active store and returns to the dashboard", async () => {
      deleteMock.mockResolvedValue(undefined);
      const dialog = await openDialog();
      const confirm = within(dialog).getByRole("button", {
        name: "Delete store",
      });
      expect(confirm).toBeDisabled();

      fireEvent.change(
        within(dialog).getByLabelText(/Type "Corner Market" to confirm/),
        { target: { value: "Corner Market" } },
      );
      fireEvent.click(confirm);

      expect(await screen.findByText("Dashboard page")).toBeInTheDocument();
      expect(deleteMock).toHaveBeenCalledWith("s1");
      expect(localStorage.getItem("x-store-id")).toBeNull();
    });

    it("cancelling deletes nothing", async () => {
      const dialog = await openDialog();
      fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(deleteMock).not.toHaveBeenCalled();
      expect(localStorage.getItem("x-store-id")).toBe("s1");
    });

    it("keeps the store selected and closes the dialog when the server refuses", async () => {
      deleteMock.mockRejectedValue({
        response: {
          status: 403,
          data: { error: "You do not have access to this store" },
        },
      });
      const dialog = await openDialog();
      fireEvent.change(
        within(dialog).getByLabelText(/Type "Corner Market" to confirm/),
        { target: { value: "Corner Market" } },
      );
      fireEvent.click(
        within(dialog).getByRole("button", { name: "Delete store" }),
      );

      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(localStorage.getItem("x-store-id")).toBe("s1");
      expect(screen.queryByText("Dashboard page")).toBeNull();
    });
  });
});
