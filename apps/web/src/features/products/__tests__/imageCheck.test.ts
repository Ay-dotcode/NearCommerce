import {
  checkImageUrl,
  clearImageCheckCache,
} from "@/helpers/image";
import { installImageLoadStub } from "@/testing/image";

describe("checkImageUrl", () => {
  let restore: () => void;
  beforeEach(() => {
    clearImageCheckCache();
    restore = installImageLoadStub();
  });
  afterEach(() => restore());

  it("accepts a link that loads as an image", async () => {
    await expect(
      checkImageUrl("https://cdn.example.com/milk.jpg"),
    ).resolves.toBe(true);
  });

  it("rejects a link that does not lead to an image", async () => {
    await expect(
      checkImageUrl("https://example.com/broken-page"),
    ).resolves.toBe(false);
  });

  it("rejects text that is not an http(s) URL without loading anything", async () => {
    await expect(checkImageUrl("not a url")).resolves.toBe(false);
    await expect(checkImageUrl("ftp://example.com/a.jpg")).resolves.toBe(false);
    await expect(checkImageUrl("")).resolves.toBe(false);
  });

  it("rejects a link that never answers once the timeout passes", async () => {
    window.Image = class {
      onload = null;
      onerror = null;
      referrerPolicy = "";
      set src(_v: string) {}
    } as unknown as typeof Image;
    await expect(
      checkImageUrl("https://slow.example.com/a.jpg", 20),
    ).resolves.toBe(false);
  });

  it("does not download the same working image twice", async () => {
    let created = 0;
    const Base = window.Image as unknown as new () => object;
    window.Image = class extends Base {
      constructor() {
        super();
        created += 1;
      }
    } as unknown as typeof Image;
    await checkImageUrl("https://cdn.example.com/a.jpg");
    await checkImageUrl("https://cdn.example.com/a.jpg");
    expect(created).toBe(1);
  });
});
