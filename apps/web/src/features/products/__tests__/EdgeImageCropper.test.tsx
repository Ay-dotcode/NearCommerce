import { act, render, screen } from "@testing-library/react";
import { EdgeImageCropper } from "../ui/EdgeImageCropper";
import { createYoloWorker } from "../workers/workerFactory";

jest.mock("../workers/workerFactory", () => ({
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
    expect(mockWorker.terminate).toHaveBeenCalled();
  });
});
