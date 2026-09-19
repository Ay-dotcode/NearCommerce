import * as ort from "onnxruntime-web";

ort.env.wasm.numThreads = 1;

self.onmessage = async (event: MessageEvent) => {
  try {
    const { imageData, width, height } = event.data;

    // Load the ONNX model from the public assets directory
    const session = await ort.InferenceSession.create("/models/yolo.onnx", {
      executionProviders: ["wasm"],
    });

    // Preprocess ImageData into a Float32Array tensor (1x3xHxW layout expected by YOLO)
    // Note: actual normalisation/channel-swap logic should match your specific model variant.
    const tensor = new ort.Tensor("float32", new Float32Array(imageData.data), [
      1,
      3,
      height,
      width,
    ]);

    const feeds = { images: tensor };
    const results = await session.run(feeds);

    // Post-process output into a bounding box [x, y, width, height].
    // This is a structural stub — wire in real NMS post-processing for production.
    void results; // suppress unused-variable warning until real post-processing is added
    const boundingBox = { x: 10, y: 10, width: 200, height: 200 };

    self.postMessage({ success: true, boundingBox });
  } catch (error: any) {
    self.postMessage({ success: false, error: error.message });
  }
};
