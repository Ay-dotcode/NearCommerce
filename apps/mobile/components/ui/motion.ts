// Animation settings shared by sheets, drawers and skeletons. Tests run with instant, JS-driven
// animations so they stay synchronous and leave no timers behind.
const isTest =
  typeof process !== "undefined" && Boolean(process.env.JEST_WORKER_ID);

export const motion = {
  duration: isTest ? 0 : 220,
  native: !isTest,
  // Skeleton shimmer is skipped entirely under test (an endless loop would never finish).
  shimmer: !isTest,
  // Looping decoration (floating icons, ripples). Never under test: it would not finish.
  ambient: !isTest,
  // How long the opening animation plays before the app shows (0 = no wait, as in tests).
  splashMs: isTest ? 0 : 1700,
};
