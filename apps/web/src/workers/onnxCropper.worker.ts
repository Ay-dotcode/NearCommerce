import {
  decodeBestBox,
  letterboxToTensor,
  YOLO_INPUT_SIZE,
} from "@/workers/yoloDecode";
// The wasm-only build: half the download of the default (WebGPU) one, and the CPU runtime
// is all this small model needs.
import * as ort from "onnxruntime-web/wasm";

ort.env.wasm.numThreads = 1;

let session: ort.InferenceSession | null = null;

const loadModel = async () => {
  session ??= await ort.InferenceSession.create("/models/yolo.onnx", {
    executionProviders: ["wasm"],
  });
  return session;
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
    const { data, letterbox } = letterboxToTensor(imageData, YOLO_INPUT_SIZE);
    const tensor = new ort.Tensor("float32", data, [
      1,
      3,
      YOLO_INPUT_SIZE,
      YOLO_INPUT_SIZE,
    ]);
    const result = await model.run({ [model.inputNames[0]]: tensor });
    const output = result[model.outputNames[0]];
    // Output is [1, 4 + classes, anchors].
    const box = decodeBestBox(
      output.data as Float32Array,
      output.dims[2],
      letterbox,
      width,
      height,
    );
    self.postMessage({
      id,
      success: box !== null,
      boundingBox: box ?? undefined,
      error: box ? undefined : "No object detected",
    });
  } catch (error) {
    self.postMessage({
      id,
      success: false,
      error: error instanceof Error ? error.message : "YOLO inference failed",
    });
  }
};
