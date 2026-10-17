// Maps a failed photo search to what the shopper should read. Kept apart from photo.ts (which
// needs the camera and image libraries) so it can be used and tested anywhere.
export function photoErrorMessage(error: unknown): string {
  const code = (error as { response?: { data?: { code?: string } } })?.response
    ?.data?.code;
  if (code === "NO_PRODUCT_DETECTED")
    return "We couldn't spot a product in that photo. Try another angle.";
  return "Photo search failed. Please try again.";
}
