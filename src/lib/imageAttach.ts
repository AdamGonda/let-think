import type { Id } from "../../convex/_generated/dataModel";

export const IMAGE_PROMPT_MAX = 4;
export const IMAGE_MAX_EDGE = 1600;
export const IMAGE_JPEG_QUALITY = 0.72;
export const IMAGE_MAX_BYTES = 4 * 1024 * 1024;
export const EMPTY_IMAGE_USER_CONTENT = "See attached image.";

const ACCEPTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function isAcceptedImageType(type: string): boolean {
  return ACCEPTED_IMAGE_TYPES.has(type);
}

export function imageFilesToAdd(
  files: File[],
  already: number,
  max = IMAGE_PROMPT_MAX,
): File[] {
  const room = Math.max(0, max - already);
  return files.filter((file) => isAcceptedImageType(file.type)).slice(0, room);
}

export function imageFilesFromDataTransfer(
  data: DataTransfer | null,
): File[] {
  if (!data) return [];
  const fromFiles = [...data.files].filter((file) =>
    isAcceptedImageType(file.type),
  );
  if (fromFiles.length > 0) return fromFiles;
  const fromItems: File[] = [];
  for (const item of data.items) {
    if (item.kind !== "file") continue;
    const file = item.getAsFile();
    if (file && isAcceptedImageType(file.type)) fromItems.push(file);
  }
  return fromItems;
}

export const imageFilesFromClipboard = imageFilesFromDataTransfer;

export async function prepareImageBlob(source: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  try {
    const scale = Math.min(
      1,
      IMAGE_MAX_EDGE / Math.max(bitmap.width, bitmap.height, 1),
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not compress image");
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", IMAGE_JPEG_QUALITY);
    });
    if (!blob) throw new Error("Could not compress image");
    if (blob.size > IMAGE_MAX_BYTES) throw new Error("Image is too large");
    return blob;
  } finally {
    bitmap.close();
  }
}

export async function uploadJpegToConvex(
  postUrl: string,
  blob: Blob,
): Promise<Id<"_storage">> {
  const result = await fetch(postUrl, {
    method: "POST",
    headers: { "Content-Type": blob.type || "image/jpeg" },
    body: blob,
  });
  if (!result.ok) throw new Error("Image upload failed");
  const json: unknown = await result.json();
  if (
    typeof json !== "object" ||
    json === null ||
    !("storageId" in json) ||
    typeof (json as { storageId: unknown }).storageId !== "string"
  ) {
    throw new Error("Image upload failed");
  }
  return (json as { storageId: Id<"_storage"> }).storageId;
}
