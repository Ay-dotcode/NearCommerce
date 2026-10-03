import { createStore } from "@/api/stores";
import { StoreOnboardingPage } from "@/pages/store-owner/StoreOnboardingPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

jest.mock("@/api/stores", () => ({ MY_STORES_KEY: ["my-stores"], createStore: jest.fn() }));
const createMock = createStore as jest.Mock;

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={["/owner/onboarding"]}>
        <Routes>
          <Route path="/owner/onboarding" element={<StoreOnboardingPage />} />
          <Route path="/owner/dashboard" element={<div>Dashboard page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

const fillValid = () => {
  const set = (l: RegExp, v: string) => fireEvent.change(screen.getByLabelText(l), { target: { value: v } });
  set(/Store name/, "Corner Market");
  set(/Street address/, "12 Main Street, Nicosia");
  set(/Latitude/, "35.18");
  set(/Longitude/, "33.38");
};

describe("StoreOnboardingPage", () => {
  beforeEach(() => {
    localStorage.clear();
    createMock.mockReset();
  });

  it("first-time owners see the setup heading and no Cancel button", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Set up your store" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });

  it("owners who already have a store can add another and cancel back to the dashboard", () => {
    localStorage.setItem("x-store-id", "s1");
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Add another store" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("Dashboard page")).toBeInTheDocument();
  });

  it("creates the store, makes it the active store and lands on the dashboard", async () => {
    createMock.mockResolvedValue({ id: "new-store", name: "Corner Market" });
    renderPage();
    fillValid();
    fireEvent.click(screen.getByRole("button", { name: "Create store" }));

    expect(await screen.findByText("Dashboard page")).toBeInTheDocument();
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ name: "Corner Market", latitude: 35.18 }));
    expect(localStorage.getItem("x-store-id")).toBe("new-store");
  });

  it("stays on the page and shows the error when creation fails; nothing is persisted", async () => {
    createMock.mockRejectedValue({ response: { status: 409, data: { error: "You can manage at most 10 stores" } } });
    renderPage();
    fillValid();
    fireEvent.click(screen.getByRole("button", { name: "Create store" }));

    expect(await screen.findByText("You can manage at most 10 stores")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Create store" })).toBeEnabled());
    expect(localStorage.getItem("x-store-id")).toBeNull();
    expect(screen.queryByText("Dashboard page")).toBeNull();
  });
});
