import {
  computeLetterbox,
  decodeBestBox,
  letterboxToTensor,
  YOLO_INPUT_SIZE,
} from "@/workers/yoloDecode";

describe("computeLetterbox", () => {
  it("fits a portrait image and centres it horizontally", () => {
    // 810x1080 -> scale 640/1080, padded left and right
    const lb = computeLetterbox(810, 1080);
    expect(lb.scale).toBeCloseTo(640 / 1080);
    expect(lb.padY).toBe(0);
    expect(lb.padX).toBe(80);
  });

  it("fits a landscape image and centres it vertically", () => {
    const lb = computeLetterbox(1280, 640);
    expect(lb.scale).toBe(0.5);
    expect(lb.padX).toBe(0);
    expect(lb.padY).toBe(160);
  });
});

describe("letterboxToTensor", () => {
  it("produces planar RGB with grey padding and the image inside", () => {
    // 2x1 image: one red pixel, one blue pixel
    const data = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255]);
    const { data: tensor, letterbox } = letterboxToTensor(
      { data, width: 2, height: 1 },
      4,
    );
    expect(letterbox).toEqual({ scale: 2, padX: 0, padY: 1 });
    const plane = 16;
    const at = (channel: number, x: number, y: number) =>
      tensor[channel * plane + y * 4 + x];

    // Padding rows are grey (114/255) in every channel
    expect(at(0, 0, 0)).toBeCloseTo(114 / 255);
    expect(at(2, 3, 3)).toBeCloseTo(114 / 255);
    // Left half of the middle rows is red, right half blue
    expect([at(0, 0, 1), at(1, 0, 1), at(2, 0, 1)]).toEqual([1, 0, 0]);
    expect([at(0, 3, 2), at(1, 3, 2), at(2, 3, 2)]).toEqual([0, 0, 1]);
  });

  it("returns a full model-sized tensor", () => {
    const { data } = letterboxToTensor({
      data: new Uint8ClampedArray(4 * 4 * 4),
      width: 4,
      height: 4,
    });
    expect(data).toHaveLength(3 * YOLO_INPUT_SIZE * YOLO_INPUT_SIZE);
  });
});

// Builds a [4 + classes, anchors] channel-major output holding the given detections.
function makeOutput(
  anchors: number,
  detections: { cx: number; cy: number; w: number; h: number; score: number }[],
  classes = 3,
) {
  const out = new Float32Array((4 + classes) * anchors);
  detections.forEach((d, i) => {
    out[i] = d.cx;
    out[anchors + i] = d.cy;
    out[2 * anchors + i] = d.w;
    out[3 * anchors + i] = d.h;
    out[(4 + 1) * anchors + i] = d.score; // class 1
  });
  return out;
}

describe("decodeBestBox", () => {
  // 1000x500 image, letterboxed to 640: scale 0.64, padY 160
  const lb = computeLetterbox(1000, 500);

  it("maps a detection from model space back to image coordinates", () => {
    // Model-space box centred at (320, 320) of size 320x160 -> image (500, 250), 500x250
    const out = makeOutput(10, [
      { cx: 320, cy: 320, w: 320, h: 160, score: 0.9 },
    ]);
    const box = decodeBestBox(out, 10, lb, 1000, 500)!;

    expect(box.score).toBeCloseTo(0.9);
    // 4% padding on each side of a 500x250 box
    expect(box.x).toBeCloseTo(250 - 20, 0);
    expect(box.y).toBeCloseTo(125 - 10, 0);
    expect(box.width).toBeCloseTo(500 + 40, 0);
    expect(box.height).toBeCloseTo(250 + 20, 0);
  });

  it("clamps boxes that spill past the image edges", () => {
    const out = makeOutput(10, [
      { cx: 20, cy: 320, w: 600, h: 300, score: 0.8 },
    ]);
    const box = decodeBestBox(out, 10, lb, 1000, 500)!;
    expect(box.x).toBe(0);
    expect(box.x + box.width).toBeLessThanOrEqual(1000);
  });

  it("prefers the larger confident object over a smaller, more confident one", () => {
    const out = makeOutput(10, [
      { cx: 100, cy: 320, w: 60, h: 60, score: 0.95 },
      { cx: 330, cy: 320, w: 400, h: 200, score: 0.6 },
    ]);
    const box = decodeBestBox(out, 10, lb, 1000, 500)!;
    expect(box.width).toBeGreaterThan(400);
  });

  it("returns null when nothing is confident enough", () => {
    const out = makeOutput(10, [
      { cx: 320, cy: 320, w: 300, h: 200, score: 0.1 },
    ]);
    expect(decodeBestBox(out, 10, lb, 1000, 500)).toBeNull();
  });

  it("ignores specks that are too small to be the product", () => {
    const out = makeOutput(10, [
      { cx: 320, cy: 320, w: 10, h: 10, score: 0.9 },
    ]);
    expect(decodeBestBox(out, 10, lb, 1000, 500)).toBeNull();
  });

  it("returns null for an output with no class channels", () => {
    expect(decodeBestBox(new Float32Array(40), 10, lb, 1000, 500)).toBeNull();
  });
});
