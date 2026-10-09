import { uploadProductImage } from "@/api/uploads";
import {
  dataUrlToBlob,
  MAX_SOURCE_IMAGE_BYTES,
  validateImageFile,
} from "@/features/products/lib/image";
import { ProductImagePicker } from "@/features/products/ui/ProductImagePicker";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

jest.mock("@/api/uploads", () => ({ uploadProductImage: jest.fn() }));

// The real cropper needs canvas and a worker; stand in for it with a button that "crops".
jest.mock("@/features/products/ui/EdgeImageCropper", () => ({
  EdgeImageCropper: ({
    imageUrl,
    onCropComplete,
  }: {
    imageUrl: string;
    onCropComplete: (dataUrl: string) => void;
  }) => (
    <div>
      <span>cropping {imageUrl}</span>
      <button
        type="button"
        onClick={() => onCropComplete("data:image/jpeg;base64,/9j/AAA=")}
      >
        Confirm Crop
      </button>
    </div>
  ),
}));

const upload = uploadProductImage as jest.Mock;
const file = (type = "image/jpeg", size = 100) =>
  new File([new Uint8Array(size)], "p.jpg", { type });

beforeAll(() => {
  URL.createObjectURL = jest.fn(() => "blob:picked");
  URL.revokeObjectURL = jest.fn();
});
beforeEach(() => jest.clearAllMocks());

const choose = (f: File) =>
  fireEvent.change(screen.getByLabelText("Choose product photo"), {
    target: { files: [f] },
  });

describe("ProductImagePicker", () => {
  it("crops, uploads, and reports the hosted URL", async () => {
    upload.mockResolvedValue("https://api.test/api/images/abc");
    const onChange = jest.fn();
    render(<ProductImagePicker value="" onChange={onChange} />);

    choose(file());
    expect(await screen.findByText("cropping blob:picked")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirm Crop" }));

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith("https://api.test/api/images/abc"),
    );
    const blob = upload.mock.calls[0][0] as Blob;
    expect(blob.type).toBe("image/jpeg");
    expect(blob.size).toBeGreaterThan(0);
    // Back to the normal view once it is saved
    expect(screen.queryByText("cropping blob:picked")).toBeNull();
  });

  it("keeps the cropper open and explains when the upload fails", async () => {
    upload.mockRejectedValue({
      response: { status: 413, data: { error: "Images can be at most 2 MB." } },
    });
    const onChange = jest.fn();
    render(<ProductImagePicker value="" onChange={onChange} />);

    choose(file());
    fireEvent.click(
      await screen.findByRole("button", { name: "Confirm Crop" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Images can be at most 2 MB.",
    );
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText("cropping blob:picked")).toBeTruthy();
  });

  it("refuses unsupported files before opening the cropper", () => {
    render(<ProductImagePicker value="" onChange={jest.fn()} />);
    choose(file("application/pdf"));
    expect(screen.getByRole("alert")).toHaveTextContent(/JPEG, PNG or WebP/);
    expect(screen.queryByText(/cropping/)).toBeNull();
  });

  it("can cancel cropping without uploading", async () => {
    render(<ProductImagePicker value="" onChange={jest.fn()} />);
    choose(file());
    await screen.findByText("cropping blob:picked");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText(/cropping/)).toBeNull();
    expect(upload).not.toHaveBeenCalled();
  });

  it("shows the current photo and lets the owner replace or remove it", () => {
    const onChange = jest.fn();
    render(
      <ProductImagePicker value="https://cdn.test/p.jpg" onChange={onChange} />,
    );
    expect(screen.getByAltText("Current product")).toHaveAttribute(
      "src",
      "https://cdn.test/p.jpg",
    );
    expect(screen.getByText("Replace photo")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove photo" }));
    expect(onChange).toHaveBeenCalledWith("");
  });
});

describe("image helpers", () => {
  it("validates type and size", () => {
    expect(validateImageFile(file())).toBeNull();
    expect(validateImageFile(file("image/gif"))).toMatch(/JPEG, PNG or WebP/);
    expect(
      validateImageFile(file("image/png", MAX_SOURCE_IMAGE_BYTES + 1)),
    ).toMatch(/15 MB/);
  });

  it("decodes a data URL into a typed Blob", () => {
    const blob = dataUrlToBlob("data:image/webp;base64,AQID");
    expect(blob.type).toBe("image/webp");
    expect(blob.size).toBe(3);
  });
});
