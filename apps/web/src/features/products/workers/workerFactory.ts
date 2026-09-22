export const createYoloWorker = (): Worker =>
  new Worker(
    new URL("../../../workers/onnxCropper.worker.ts", import.meta.url),
    {
      type: "module",
    },
  );
