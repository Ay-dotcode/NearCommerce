// jsdom never loads images, so tests install this stub: any URL "loads" as a valid image unless
// it contains "broken", in which case the browser's error event fires instead.
export function installImageLoadStub() {
  const original = window.Image;
  class StubImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    naturalWidth = 100;
    naturalHeight = 100;
    referrerPolicy = "";
    set src(value: string) {
      setTimeout(() => {
        if (value.includes("broken")) this.onerror?.();
        else this.onload?.();
      }, 0);
    }
  }
  window.Image = StubImage as unknown as typeof Image;
  return () => {
    window.Image = original;
  };
}
