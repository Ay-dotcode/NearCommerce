import { EdgeImageCropper } from "@/features/products/ui/EdgeImageCropper";
import { createYoloWorker } from "@/workers/workerFactory";
import { act, fireEvent, render, screen } from "@testing-library/react";

jest.mock("@/workers/workerFactory", () => ({
  createYoloWorker: jest.fn(),
}));

describe("EdgeImageCropper (Task 4.2.3)", () => {
  let mockWorker: {
    postMessage: jest.Mock;
    terminate: jest.Mock;
    onmessage: ((event: MessageEvent) => void) | null;
  };

  beforeEach(() => {
    jest.useFakeTimers();

    // Stub Image so that assigning src automatically fires onload via setTimeout(0),
    global.Image = class {
      crossOrigin: string = "";
      width: number = 300;
      height: number = 300;
      onload: (() => void) | null = null;
      private _src: string = "";
      get src() {
        return this._src;
      }
      set src(val: string) {
        this._src = val;
        setTimeout(() => this.onload?.(), 0);
      }
    } as any;

    // Stub canvas 2D context
    HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
      drawImage: jest.fn(),
      getImageData: jest
        .fn()
        .mockReturnValue({ data: new Uint8ClampedArray(10) }),
      putImageData: jest.fn(),
    }) as any;

    // Build a mock worker and wire createYoloWorker to return it
    mockWorker = {
      postMessage: jest.fn(),
      terminate: jest.fn(),
      onmessage: null,
    };
    (createYoloWorker as jest.Mock).mockReturnValue(mockWorker);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("renders the AI crop box when the worker returns a successful bounding box", async () => {
    render(
      <EdgeImageCropper imageUrl="blob:test" onCropComplete={jest.fn()} />,
    );

    await act(async () => {
      jest.advanceTimersByTime(10);
    });

    act(() => {
      if (mockWorker.onmessage) {
        mockWorker.onmessage({
          data: {
            success: true,
            boundingBox: { x: 10, y: 10, width: 100, height: 100 },
          },
        } as MessageEvent);
      }
    });

    expect(screen.getByTestId("ai-crop-box")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /confirm crop/i }),
    ).toBeInTheDocument();
  });

  it("falls back to manual mode gracefully if the AI takes longer than 3 seconds", async () => {
    render(
      <EdgeImageCropper imageUrl="blob:test" onCropComplete={jest.fn()} />,
    );

    await act(async () => {
      jest.advanceTimersByTime(10);
    });

    expect(screen.getByText(/running edge ai/i)).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(screen.getByTestId("manual-mode-alert")).toBeInTheDocument();
    expect(screen.getByTestId("manual-crop-box")).toBeInTheDocument();
    expect(mockWorker.terminate).toHaveBeenCalled();
  });

  it("falls back to manual mode when the worker reports an error", async () => {
    render(
      <EdgeImageCropper imageUrl="blob:test" onCropComplete={jest.fn()} />,
    );

    await act(async () => {
      jest.advanceTimersByTime(10);
    });

    act(() => {
      mockWorker.onmessage?.({
        data: { success: false, error: "model unavailable" },
      } as MessageEvent);
    });

    expect(screen.getByTestId("manual-mode-alert")).toBeInTheDocument();
    expect(screen.getByTestId("manual-crop-box")).toBeInTheDocument();
  });

  const stubImage = (width: number, height: number, fail = false) => {
    global.Image = class {
      crossOrigin = "";
      width = width;
      height = height;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        setTimeout(() => (fail ? this.onerror?.() : this.onload?.()), 0);
      }
    } as any;
  };
  const ctx = () => (HTMLCanvasElement.prototype.getContext as jest.Mock)();

  it("downsizes very large photos before running detection", async () => {
    stubImage(4000, 2000);
    const { container } = render(
      <EdgeImageCropper imageUrl="blob:big" onCropComplete={jest.fn()} />,
    );
    await act(async () => {
      jest.advanceTimersByTime(10);
    });

    const canvas = container.querySelector("canvas")!;
    expect([canvas.width, canvas.height]).toEqual([1600, 800]);
    expect(ctx().drawImage).toHaveBeenCalledWith(
      expect.anything(),
      0,
      0,
      1600,
      800,
    );
    expect(mockWorker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ width: 1600, height: 800 }),
    );
  });

  it("exports the selected area as a compact JPEG", async () => {
    stubImage(2000, 1000);
    const toDataURL = jest.fn().mockReturnValue("data:image/jpeg;base64,AAA");
    HTMLCanvasElement.prototype.toDataURL = toDataURL;
    const onCropComplete = jest.fn();
    render(
      <EdgeImageCropper imageUrl="blob:ok" onCropComplete={onCropComplete} />,
    );
    await act(async () => {
      jest.advanceTimersByTime(10);
    });
    act(() => {
      mockWorker.onmessage?.({
        data: {
          success: true,
          boundingBox: { x: 100, y: 50, width: 2000, height: 1000 },
        },
      } as MessageEvent);
    });

    fireEvent.click(screen.getByRole("button", { name: /confirm crop/i }));

    // The 2000x1000 selection is shrunk to a 1024px long side before export.
    expect(ctx().drawImage).toHaveBeenLastCalledWith(
      expect.anything(),
      100,
      50,
      2000,
      1000,
      0,
      0,
      1024,
      512,
    );
    expect(toDataURL).toHaveBeenCalledWith("image/jpeg", 0.85);
    expect(onCropComplete).toHaveBeenCalledWith("data:image/jpeg;base64,AAA");
  });

  it("never submits a surrounding form when confirming", async () => {
    render(<EdgeImageCropper imageUrl="blob:ok" onCropComplete={jest.fn()} />);
    await act(async () => {
      jest.advanceTimersByTime(10);
    });
    act(() => {
      mockWorker.onmessage?.({
        data: {
          success: true,
          boundingBox: { x: 0, y: 0, width: 5, height: 5 },
        },
      } as MessageEvent);
    });
    expect(
      screen.getByRole("button", { name: /confirm crop/i }),
    ).toHaveAttribute("type", "button");
  });

  it("tells the user when the image cannot be opened", async () => {
    stubImage(10, 10, true);
    render(
      <EdgeImageCropper imageUrl="blob:broken" onCropComplete={jest.fn()} />,
    );
    await act(async () => {
      jest.advanceTimersByTime(10);
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't be opened/i);
    expect(screen.queryByRole("button", { name: /confirm crop/i })).toBeNull();
  });
});
