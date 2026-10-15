// Rounds the top of the axis up to a tidy number so gridlines land on whole counts.
export const niceMax = (max: number) => {
  if (max <= 4) return 4;
  const step = 10 ** Math.floor(Math.log10(max));
  return Math.ceil(max / step) * step;
};
