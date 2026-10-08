import { pickPhoto } from "@/utils/photo";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock("expo-image-manipulator", () => {
  const saveAsync = jest.fn();
  const resize = jest.fn();
  const context = { resize, renderAsync: jest.fn() };
  resize.mockReturnValue(context);
  context.renderAsync.mockResolvedValue({ saveAsync });
  return {
    SaveFormat: { JPEG: "jpeg" },
    ImageManipulator: { manipulate: jest.fn(() => context) },
    __mocks: { saveAsync, resize, context },
  };
});

const picker = ImagePicker as jest.Mocked<typeof ImagePicker>;
const { saveAsync, resize } = (ImageManipulator as any).__mocks;

const asset = (width: number) => ({ uri: "file:///p.jpg", width, height: 900 });

beforeEach(() => {
  jest.clearAllMocks();
  saveAsync.mockResolvedValue({ base64: "AAAA", uri: "file:///out.jpg" });
});

describe("pickPhoto", () => {
  it("asks for camera permission and reports a refusal", async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue({
      granted: false,
    } as never);
    await expect(pickPhoto("camera")).resolves.toBe("denied");
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it("returns null when the picker is cancelled", async () => {
    picker.launchImageLibraryAsync.mockResolvedValue({
      canceled: true,
      assets: null,
    } as never);
    await expect(pickPhoto("library")).resolves.toBeNull();
  });

  it("shrinks and compresses the photo to a base64 JPEG", async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue({
      granted: true,
    } as never);
    picker.launchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [asset(4000)],
    } as never);

    await expect(pickPhoto("camera")).resolves.toEqual({
      base64: "AAAA",
      mimeType: "image/jpeg",
    });
    expect(resize).toHaveBeenCalledWith({ width: 768 });
    expect(saveAsync).toHaveBeenCalledWith({
      format: "jpeg",
      compress: 0.7,
      base64: true,
    });
  });

  it("does not enlarge small photos and needs no permission for the library", async () => {
    picker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [asset(500)],
    } as never);
    await pickPhoto("library");
    expect(picker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
    expect(resize).toHaveBeenCalledWith({ width: 500 });
  });

  it("fails clearly when no image data comes back", async () => {
    picker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [asset(500)],
    } as never);
    saveAsync.mockResolvedValue({ uri: "file:///out.jpg" });
    await expect(pickPhoto("library")).rejects.toThrow(/could not read/i);
  });
});
