// Pure helpers for the bundled Ultralytics YOLOv8n model (input 1x3x640x640, output
// 1x(4+classes)x8400, no NMS). Kept free of onnxruntime so they can be unit tested.

export const YOLO_INPUT_SIZE = 640;
export const YOLO_SCORE_THRESHOLD = 0.25;
// Detections smaller than this share of the image are noise, not the product.
export const MIN_BOX_AREA_RATIO = 0.02;
// Breathing room added around the detected object.
export const BOX_PADDING_RATIO = 0.04;
const LETTERBOX_FILL = 114 / 255;

export interface Letterbox {
  scale: number;
  padX: number;
  padY: number;
}

export interface DetectedBox {
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
}

// Scales the image to fit the square model input without distortion, centred with padding.
export function computeLetterbox(
  width: number,
  height: number,
  size = YOLO_INPUT_SIZE,
): Letterbox {
  const scale = Math.min(size / width, size / height);
  return {
    scale,
    padX: Math.floor((size - Math.round(width * scale)) / 2),
    padY: Math.floor((size - Math.round(height * scale)) / 2),
  };
}

// Planar RGB floats in [0, 1] (CHW order), letterboxed with grey padding.
export function letterboxToTensor(
  image: { data: Uint8ClampedArray; width: number; height: number },
  size = YOLO_INPUT_SIZE,
): { data: Float32Array; letterbox: Letterbox } {
  const letterbox = computeLetterbox(image.width, image.height, size);
  const plane = size * size;
  const data = new Float32Array(3 * plane).fill(LETTERBOX_FILL);
  const innerW = Math.round(image.width * letterbox.scale);
  const innerH = Math.round(image.height * letterbox.scale);

  for (let y = 0; y < innerH; y += 1) {
    const sourceY = Math.min(image.height - 1, Math.floor(y / letterbox.scale));
    for (let x = 0; x < innerW; x += 1) {
      const sourceX = Math.min(
        image.width - 1,
        Math.floor(x / letterbox.scale),
      );
      const source = (sourceY * image.width + sourceX) * 4;
      const target = (y + letterbox.padY) * size + (x + letterbox.padX);
      data[target] = image.data[source] / 255;
      data[plane + target] = image.data[source + 1] / 255;
      data[2 * plane + target] = image.data[source + 2] / 255;
    }
  }
  return { data, letterbox };
}

// Picks the box most likely to be "the product": confident and large. Returns null when
// nothing clears the threshold, which sends the user to manual cropping.
export function decodeBestBox(
  output: ArrayLike<number>,
  numAnchors: number,
  letterbox: Letterbox,
  imageWidth: number,
  imageHeight: number,
  threshold = YOLO_SCORE_THRESHOLD,
): DetectedBox | null {
  const channels = Math.floor(output.length / numAnchors);
  if (numAnchors <= 0 || channels <= 4) return null;

  let best: DetectedBox | null = null;
  let bestRank = 0;

  for (let i = 0; i < numAnchors; i += 1) {
    let score = 0;
    for (let c = 4; c < channels; c += 1)
      score = Math.max(score, output[c * numAnchors + i]);
    if (score < threshold) continue;

    const cx = output[i];
    const cy = output[numAnchors + i];
    const w = output[2 * numAnchors + i];
    const h = output[3 * numAnchors + i];

    // Back to image coordinates, then pad and clamp.
    let x1 = (cx - w / 2 - letterbox.padX) / letterbox.scale;
    let y1 = (cy - h / 2 - letterbox.padY) / letterbox.scale;
    let x2 = (cx + w / 2 - letterbox.padX) / letterbox.scale;
    let y2 = (cy + h / 2 - letterbox.padY) / letterbox.scale;
    const padX = (x2 - x1) * BOX_PADDING_RATIO;
    const padY = (y2 - y1) * BOX_PADDING_RATIO;
    x1 = Math.max(0, x1 - padX);
    y1 = Math.max(0, y1 - padY);
    x2 = Math.min(imageWidth, x2 + padX);
    y2 = Math.min(imageHeight, y2 + padY);

    const width = x2 - x1;
    const height = y2 - y1;
    if (width <= 0 || height <= 0) continue;
    const area = width * height;
    if (area < MIN_BOX_AREA_RATIO * imageWidth * imageHeight) continue;

    const rank = score * area;
    if (rank > bestRank) {
      bestRank = rank;
      best = { x: x1, y: y1, width, height, score };
    }
  }
  return best;
}
