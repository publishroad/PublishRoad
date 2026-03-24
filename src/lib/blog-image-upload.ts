export async function uploadBlogImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/admin/blog/upload-image", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? "Image upload failed");
  }

  const data = (await response.json()) as { url?: string };
  if (!data.url) {
    throw new Error("Image URL missing in upload response");
  }

  return data.url;
}
