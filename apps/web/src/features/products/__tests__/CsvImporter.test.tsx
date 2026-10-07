import CsvImporter from "@/components/store-owner/CsvImporter";
import { apiClient } from "@nearcommerce/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

jest.mock("@nearcommerce/api", () => {
  const actual = jest.requireActual("@nearcommerce/api");
  return {
    ...actual,
    STORE_KEY: "x-store-id",
    apiClient: { post: jest.fn() },
  };
});
const post = apiClient.post as jest.Mock;

function renderImporter() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidate = jest.spyOn(client, "invalidateQueries");
  render(
    <QueryClientProvider client={client}>
      <CsvImporter />
    </QueryClientProvider>,
  );
  return { invalidate };
}

const upload = (csv: string, name = "inventory.csv") =>
  fireEvent.change(screen.getByTestId("csv-input"), {
    target: { files: [new File([csv], name, { type: "text/csv" })] },
  });

describe("Dual-Mode CSV Importer (Task 4.2.2)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("publishes rows that have an image URL and drafts the rest", async () => {
    post.mockResolvedValueOnce({ data: { success: true } });
    renderImporter();

    upload(
      [
        "name,price,quantity,image_url",
        "Published Item,19.99,5,https://example.com/image.jpg",
        "Draft Item,9.99,10,",
      ].join("\n"),
    );

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("/api/products/import", {
        products: [
          {
            name: "Published Item",
            price: 19.99,
            quantity: 5,
            image_url: "https://example.com/image.jpg",
            is_published: true,
          },
          {
            name: "Draft Item",
            price: 9.99,
            quantity: 10,
            image_url: null,
            is_published: false,
          },
        ],
      }),
    );
  });

  it("summarises created, updated and merged rows and explains drafts", async () => {
    post.mockResolvedValueOnce({
      data: { data: { total: 3, created: 1, updated: 1, duplicatesMerged: 1 } },
    });
    const { invalidate } = renderImporter();

    upload(
      "name,price,quantity,image_url\nA product,1.00,1,\nB product,2.00,2,\nC product,3.00,3,https://x.test/c.png",
    );

    const dialog = await screen.findByRole("dialog", {
      name: "Import complete",
    });
    const stat = (label: string) =>
      within(dialog).getByText(label).nextElementSibling;
    expect(stat("Rows")).toHaveTextContent("3");
    expect(stat("Created")).toHaveTextContent("1");
    expect(stat("Updated")).toHaveTextContent("1");
    expect(stat("Duplicates merged")).toHaveTextContent("1");
    expect(
      within(dialog).getByText(/2 products had no image URL/),
    ).toBeInTheDocument();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["store-products"] });

    fireEvent.click(within(dialog).getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("lists every bad row and sends nothing when the file is invalid", async () => {
    renderImporter();
    upload("name,price,quantity\nGood,1.00,1\nBad,abc,1\nWorse,2.00,x");

    const dialog = await screen.findByRole("dialog", { name: "Import failed" });
    expect(
      within(dialog).getByText(/Nothing was imported/),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/Row 2:/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Row 3:/)).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it("reports a file that is missing required columns", async () => {
    renderImporter();
    upload("name,cost\nTea,3");
    expect(
      await screen.findByText(/missing required column/i),
    ).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it("shows the server's per-row problems from a 422", async () => {
    post.mockRejectedValueOnce({
      response: {
        status: 422,
        data: {
          error: "Some rows are invalid. Fix them and upload the file again.",
          details: [{ path: "row 2: image_url", message: "Invalid image URL" }],
          totalProblems: 120,
        },
      },
    });
    renderImporter();
    upload("name,price,quantity\nTea,3,1");

    const dialog = await screen.findByRole("dialog", { name: "Import failed" });
    expect(
      within(dialog).getByText(/Some rows are invalid/),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/row 2: image_url: Invalid image URL/),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Showing the first 1 of 120 problems/),
    ).toBeInTheDocument();
  });

  it("handles unexpected API errors gracefully", async () => {
    post.mockRejectedValueOnce(new Error("API Error"));
    renderImporter();
    upload("name,price,quantity\nTest,1.00,1");
    expect(
      await screen.findByText(/Server error during import/i),
    ).toBeInTheDocument();
  });

  it("clears the file input so the same file can be chosen again", async () => {
    renderImporter();
    upload("name,cost\nTea,3");
    await screen.findByRole("dialog");
    expect((screen.getByTestId("csv-input") as HTMLInputElement).value).toBe(
      "",
    );
  });

  it("downloads the template", () => {
    const createObjectURL = jest.fn(() => "blob:template");
    const revokeObjectURL = jest.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    renderImporter();
    fireEvent.click(screen.getByRole("button", { name: "Download template" }));

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:template");
    click.mockRestore();
  });
});
