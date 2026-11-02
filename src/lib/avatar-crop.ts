export type CropCenter = { x: number; y: number };
export const MAX_AVATAR_ZOOM = 4;
export const AVATAR_OUTPUT_SIZE = 512;

export function squareCrop(width: number, height: number, zoom: number, center: CropCenter) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new Error("This image could not be opened. Choose another picture.");
  const safeZoom = Number.isFinite(zoom) ? Math.min(MAX_AVATAR_ZOOM, Math.max(1, zoom)) : 1;
  const size = Math.min(width, height) / safeZoom;
  const x = Math.min(width - size, Math.max(0, (Number.isFinite(center.x) ? center.x : 0.5) * width - size / 2));
  const y = Math.min(height - size, Math.max(0, (Number.isFinite(center.y) ? center.y : 0.5) * height - size / 2));
  return { x, y, size, center: { x: (x + size / 2) / width, y: (y + size / 2) / height } };
}

export async function cropAvatar(image: HTMLImageElement, zoom: number, center: CropCenter): Promise<File> {
  const crop = squareCrop(image.naturalWidth, image.naturalHeight, zoom, center);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_OUTPUT_SIZE;
  canvas.height = AVATAR_OUTPUT_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not crop this picture. Please try again.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, crop.x, crop.y, crop.size, crop.size, 0, 0, AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Unable to prepare your picture. Please try again.")), "image/png");
  });
  return new File([blob], "profile-picture.png", { type: "image/png" });
}
