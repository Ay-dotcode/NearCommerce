import * as ort from "onnxruntime-web";

ort.env.wasm.numThreads = 1;

let session: ort.InferenceSession | null = null;

const loadModel = async () => {
  session ??= await ort.InferenceSession.create("/models/yolo.onnx", {
    executionProviders: ["wasm"],
  });
  return session;
};

const preprocess = (imageData: ImageData, width: number, height: number) => {
  const values = new Float32Array(3 * width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(
        imageData.width - 1,
        Math.floor((x * imageData.width) / width),
      );
      const sourceY = Math.min(
        imageData.height - 1,
        Math.floor((y * imageData.height) / height),
      );
      const source = (sourceY * imageData.width + sourceX) * 4;
      const target = y * width + x;
      values[target] = imageData.data[source] / 255;
      values[width * height + target] = imageData.data[source + 1] / 255;
      values[2 * width * height + target] = imageData.data[source + 2] / 255;
    }
  }
  return values;
};

self.onmessage = async (event: MessageEvent) => {
  const { imageData, width, height, id } = event.data as {
    imageData: ImageData;
    width: number;
    height: number;
    id?: string;
  };
  try {
    const model = await loadModel();
    const inputShape = (
      model.inputMetadata[0] as
        | { dimensions?: Array<number | string> }
        | undefined
    )?.dimensions;
    const inputHeight = Number(inputShape?.[2]) || 640;
    const inputWidth = Number(inputShape?.[3]) || 640;
    const tensor = new ort.Tensor(
      "float32",
      preprocess(imageData, inputWidth, inputHeight),
      [1, 3, inputHeight, inputWidth],
    );
    const result = await model.run({ [model.inputNames[0]]: tensor });
    const output = result[model.outputNames[0]];
    const data = output?.data as Float32Array | undefined;
    const score = data?.[4] ?? 0;
    const detected = score > 0.25;
    self.postMessage({
      id,
      success: detected,
      boundingBox: detected ? { x: 0, y: 0, width, height, score } : undefined,
      error: detected ? undefined : "No object detected",
    });
  } catch (error) {
    self.postMessage({
      id,
      success: false,
      error: error instanceof Error ? error.message : "YOLO inference failed",
    });
  }
};
