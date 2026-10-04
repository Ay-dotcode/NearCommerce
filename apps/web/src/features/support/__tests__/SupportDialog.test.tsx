import { SupportDialog } from "@/features/support/ui/SupportDialog";
import { apiClient } from "@nearcommerce/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";

jest.mock("@nearcommerce/api", () => ({ apiClient: { get: jest.fn() } }));
const get = apiClient.get as jest.Mock;

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

  it("shows email, phone and hours as working links", async () => {
    get.mockResolvedValue({
      data: {
        channels: { email: "help@example.com", phone: "+905551112233" },
        operating_hours: "24/7",
      },
    });
    renderDialog();
    expect(
      await screen.findByRole("link", { name: "help@example.com" }),
    ).toHaveAttribute("href", "mailto:help@example.com");
    expect(screen.getByRole("link", { name: "+905551112233" })).toHaveAttribute(
      "href",
      "tel:+905551112233",
    );
    expect(screen.getByText("24/7")).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith("/support");
  });

  it("offers a retry when loading fails", async () => {
    get.mockRejectedValueOnce(new Error("offline"));
    renderDialog();
    expect(
      await screen.findByText(/couldn't load the support details/i),
    ).toBeInTheDocument();

    get.mockResolvedValue({
      data: {
        channels: { email: "a@b.co", phone: "1" },
        operating_hours: "9-5",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("9-5")).toBeInTheDocument();
  });

  it("closes from the footer button", async () => {
    get.mockReturnValue(new Promise(() => {}));
    const onClose = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });
});
