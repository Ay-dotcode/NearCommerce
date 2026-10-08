import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

// Photos are shrunk before upload: the vision model needs far less than a 12 MP original,
// and the API rejects very large request bodies.
const MAX_PHOTO_WIDTH = 768;
const PHOTO_QUALITY = 0.7;

export type PhotoSource = "camera" | "library";
export type PickedPhoto = { base64: string; mimeType: string };
// "denied" means the user refused the permission; null means they backed out of the picker.
export type PhotoPickResult = PickedPhoto | "denied" | null;

export async function pickPhoto(source: PhotoSource): Promise<PhotoPickResult> {
  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return "denied";
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    quality: PHOTO_QUALITY,
  };
  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const rendered = await ImageManipulator.ImageManipulator.manipulate(asset.uri)
    .resize({
      width: Math.min(MAX_PHOTO_WIDTH, asset.width || MAX_PHOTO_WIDTH),
    })
    .renderAsync();
  const saved = await rendered.saveAsync({
    format: ImageManipulator.SaveFormat.JPEG,
    compress: PHOTO_QUALITY,
    base64: true,
  });
  if (!saved.base64) throw new Error("Could not read the photo.");
  return { base64: saved.base64, mimeType: "image/jpeg" };
}
