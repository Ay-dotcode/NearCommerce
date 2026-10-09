import { uploadProductImage } from "@/api/uploads";
import { apiClient } from "@nearcommerce/api";

jest.mock("@nearcommerce/api", () => ({
  ...jest.requireActual("@nearcommerce/api"),
  apiClient: { post: jest.fn() },
}));

describe("uploadProductImage", () => {
  it("posts the raw image with its own content type and returns the URL", async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { url: "https://api.test/api/images/1" },
    });
    const blob = new Blob([new Uint8Array([1, 2])], { type: "image/jpeg" });

    await expect(uploadProductImage(blob)).resolves.toBe(
      "https://api.test/api/images/1",
    );
    expect(apiClient.post).toHaveBeenCalledWith("/api/uploads/images", blob, {
      headers: { "Content-Type": "image/jpeg" },
    });
  });
});
