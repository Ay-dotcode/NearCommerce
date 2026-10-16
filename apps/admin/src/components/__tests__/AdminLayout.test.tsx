import { AdminLayout } from "@/components/AdminLayout";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

jest.mock("@/session", () => ({
  getAccessToken: () => "t",
  getUserRole: () => "SYSTEM_ADMIN",
  signOutEverywhere: jest.fn(),
}));

const renderLayout = (path = "/users") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/dashboard" element={<p>dashboard page</p>} />
          <Route path="/users" element={<p>users page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

describe("AdminLayout", () => {
  it("has the admin background, a theme toggle and a home link on the app icon", () => {
    renderLayout();
    expect(screen.getByTestId("admin-aurora")).toBeInTheDocument();
    expect(
      screen.getByRole("radiogroup", { name: "Theme" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "NearCommerce home" }),
    ).toHaveAttribute("href", "/dashboard");
  });

  it("clicking the app icon goes to the default page", () => {
    renderLayout("/users");
    fireEvent.click(screen.getByRole("link", { name: "NearCommerce home" }));
    expect(screen.getByText("dashboard page")).toBeInTheDocument();
  });

  it("opens the command palette with Ctrl+K and jumps to a page", () => {
    renderLayout("/users");
    expect(
      screen.queryByRole("dialog", { name: "Command palette" }),
    ).toBeNull();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const palette = screen.getByRole("dialog", { name: "Command palette" });
    fireEvent.change(within(palette).getByRole("combobox"), {
      target: { value: "dash" },
    });
    fireEvent.keyDown(within(palette).getByRole("combobox"), { key: "Enter" });
    expect(screen.getByText("dashboard page")).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Command palette" }),
    ).toBeNull();
  });

  it("animates the page content in when the route changes", () => {
    renderLayout();
    expect(screen.getByTestId("page-transition")).toHaveTextContent(
      "users page",
    );
  });
});
