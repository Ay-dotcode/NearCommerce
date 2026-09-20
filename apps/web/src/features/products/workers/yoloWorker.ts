import * as ort from "onnxruntime-web";

ort.env.wasm.numThreads = 1;

interface Detection {
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(value, maximum));

const preprocess = (
  imageData: ImageData,
  inputWidth: number,
  inputHeight: number,
) => {
  const tensorData = new Float32Array(3 * inputWidth * inputHeight);
  const scaleX = imageData.width / inputWidth;
  const scaleY = imageData.height / inputHeight;

  for (let y = 0; y < inputHeight; y += 1) {
    for (let x = 0; x < inputWidth; x += 1) {
      const sourceX = Math.min(imageData.width - 1, Math.floor(x * scaleX));
      const sourceY = Math.min(imageData.height - 1, Math.floor(y * scaleY));
      const sourceOffset = (sourceY * imageData.width + sourceX) * 4;
      const targetOffset = y * inputWidth + x;

      tensorData[targetOffset] = imageData.data[sourceOffset] / 255;
      tensorData[inputWidth * inputHeight + targetOffset] =
        imageData.data[sourceOffset + 1] / 255;
      tensorData[2 * inputWidth * inputHeight + targetOffset] =
        imageData.data[sourceOffset + 2] / 255;
    }
  }

  return tensorData;
};

const decodeDetections = (
  output: ort.Tensor,
  sourceWidth: number,
  sourceHeight: number,
  inputWidth: number,
  inputHeight: number,
): Detection | null => {
  const dimensions = output.dims;
  const values = output.data as Float32Array;
  const transposed = dimensions.length === 3 && dimensions[1] < dimensions[2];
  const rows = transposed ? dimensions[2] : dimensions[1];
  const columns = transposed ? dimensions[1] : dimensions[2];
  let best: Detection | null = null;

  for (let row = 0; row < rows; row += 1) {
    const getValue = (column: number) =>
      values[transposed ? column * rows + row : row * columns + column];
    const objectness = columns > 5 ? getValue(4) : 1;
    let classScore = 1;
    if (columns > 5)
      for (let column = 5; column < columns; column += 1)
        classScore = Math.max(classScore, getValue(column));
    const score = objectness * classScore;
    if (score < 0.25) continue;

    const centerX = (getValue(0) * sourceWidth) / inputWidth;
    const centerY = (getValue(1) * sourceHeight) / inputHeight;
    const width = (getValue(2) * sourceWidth) / inputWidth;
    const height = (getValue(3) * sourceHeight) / inputHeight;
    const detection = {
      x: clamp(centerX - width / 2, 0, sourceWidth),
      y: clamp(centerY - height / 2, 0, sourceHeight),
      width: clamp(width, 1, sourceWidth),
      height: clamp(height, 1, sourceHeight),
      score,
    };

    if (!best || detection.score > best.score) best = detection;
  }

  return best;
};

self.onmessage = async (event: MessageEvent) => {
  try {
    const { imageData, width, height } = event.data as {
      imageData: ImageData;
      width: number;
      height: number;
    };

    const session = await ort.InferenceSession.create("/models/yolo.onnx", {
      executionProviders: ["wasm"],
    });
    const inputMetadata = session.inputMetadata[0] as
      | {
          dimensions?: Array<number | string>;
        }
      | undefined;
    const inputShape = inputMetadata?.dimensions;
    const inputHeight = Number(inputShape?.[2]) || 640;
    const inputWidth = Number(inputShape?.[3]) || 640;
    const inputName = session.inputNames[0];

    const tensor = new ort.Tensor(
      "float32",
      preprocess(imageData, inputWidth, inputHeight),
      [1, 3, inputHeight, inputWidth],
    );
    const results = await session.run({ [inputName]: tensor });
    const output = results[session.outputNames[0]];
    const detection = output
      ? decodeDetections(output, width, height, inputWidth, inputHeight)
      : null;

    if (!detection) {
      self.postMessage({ success: false, error: "No object detected" });
      return;
    }
    self.postMessage({ success: true, boundingBox: detection });
  } catch (error: any) {
    self.postMessage({
      success: false,
      error: error instanceof Error ? error.message : "YOLO inference failed",
    });
  }
};
