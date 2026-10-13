import { SupportDialog } from "@/features/support/ui/SupportDialog";
import { getSupportChannels } from "@nearcommerce/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";

jest.mock("@nearcommerce/api", () => {
  const actual = jest.requireActual("@nearcommerce/api");
  return { ...actual, getSupportChannels: jest.fn() };
});
const get = getSupportChannels as jest.Mock;

const renderDialog = (open = true, onClose = jest.fn()) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <SupportDialog open={open} onClose={onClose} />
    </QueryClientProvider>,
  );
  return onClose;
};

describe("SupportDialog", () => {
  beforeEach(() => jest.clearAllMocks());

  it("does not fetch while closed", () => {
    renderDialog(false);
    expect(get).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows email and phone as working links, with no opening hours", async () => {
    get.mockResolvedValue({
      channels: { email: "help@example.com", phone: "+905551112233" },
    });
    renderDialog();
    expect(
      await screen.findByRole("link", { name: "help@example.com" }),
    ).toHaveAttribute("href", "mailto:help@example.com");
    expect(screen.getByRole("link", { name: "+905551112233" })).toHaveAttribute(
      "href",
      "tel:+905551112233",
    );
    expect(screen.queryByText(/24\/7|hours/i)).not.toBeInTheDocument();
    expect(get).toHaveBeenCalled();
  });

  it("offers a retry when loading fails", async () => {
    get.mockRejectedValueOnce(new Error("offline"));
    renderDialog();
    expect(
      await screen.findByText(/couldn't load the support details/i),
    ).toBeInTheDocument();

    get.mockResolvedValue({ channels: { email: "a@b.co", phone: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      await screen.findByRole("link", { name: "a@b.co" }),
    ).toBeInTheDocument();
  });

  it("closes from the footer button", async () => {
    get.mockReturnValue(new Promise(() => {}));
    const onClose = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });
});
