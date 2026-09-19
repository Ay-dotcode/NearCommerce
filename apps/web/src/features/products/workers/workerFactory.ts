export const createYoloWorker = (): Worker =>
  new Worker(new URL("./yoloWorker.ts", import.meta.url), {
    type: "module",
  });
