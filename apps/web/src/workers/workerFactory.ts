export const createYoloWorker = (): Worker =>
  new Worker(new URL("./onnxCropper.worker.ts", import.meta.url), {
    type: "module",
  });
