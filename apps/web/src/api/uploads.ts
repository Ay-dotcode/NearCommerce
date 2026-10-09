import { apiClient } from "@nearcommerce/api";

// Uploads a (cropped) product image and returns the public URL to store on the product.
export async function uploadProductImage(image: Blob): Promise<string> {
  const response = await apiClient.post<{ url: string }>(
    "/api/uploads/images",
    image,
    { headers: { "Content-Type": image.type } },
  );
  return response.data.url;
}
