/**
 * Shared image utilities for the comp card feature.
 * Used by both the dashboard comp card and the public free comp card.
 * All functions are browser-only (use canvas/Image).
 */

export const CARD_ASPECT = 5.5 / 8.5; // width / height

/**
 * Pre-crop an image to the comp card aspect ratio at a given object-position and zoom.
 * posX/posY are percentages (0–100) controlling which region is visible.
 * zoom is a multiplier (1 = fit, 2 = 2x zoom in).
 */
export function cropToPosition(
  dataUrl: string,
  posX: number,
  posY: number,
  zoom: number = 1,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const imgW = img.naturalWidth;
      const imgH = img.naturalHeight;

      let baseW: number, baseH: number;
      const imgAspect = imgW / imgH;
      if (imgAspect > CARD_ASPECT) {
        baseH = imgH;
        baseW = imgH * CARD_ASPECT;
      } else {
        baseW = imgW;
        baseH = imgW / CARD_ASPECT;
      }

      const srcW = baseW / zoom;
      const srcH = baseH / zoom;

      const maxOffsetX = imgW - srcW;
      const maxOffsetY = imgH - srcH;
      const srcX = maxOffsetX * (posX / 100);
      const srcY = maxOffsetY * (posY / 100);

      const outW = Math.min(Math.round(srcW), 2000);
      const outH = Math.round(outW / CARD_ASPECT);
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = () => reject(new Error("Failed to crop image"));
    img.src = dataUrl;
  });
}

/**
 * For logos and non-photo assets — preserves original format (PNG transparency).
 */
export async function toBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Max longest side for embedded photos — keeps exported PDFs/JPEGs small and
 * stays under iOS Safari's canvas pixel limits (mirrors cropToPosition's cap).
 */
const MAX_PHOTO_DIMENSION = 1600;

/**
 * For photos — loads via <img> element which reliably applies EXIF rotation
 * in all modern browsers, then draws to canvas to produce a normalized JPEG,
 * downscaled to MAX_PHOTO_DIMENSION on the longest side.
 */
export function photoToBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const scale = Math.min(
        1,
        MAX_PHOTO_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight),
      );
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}

/**
 * Returns true for image types we accept (JPEG, PNG, WebP, GIF, HEIC/HEIF).
 * HEIC/HEIF is converted to JPEG server-side by /api/upload/complete;
 * browsers often report an empty MIME type for it, so also check extension.
 */
export function isAcceptedImage(file: File): boolean {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif",
  ];
  if (allowedTypes.includes(file.type)) return true;
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return ext === "heic" || ext === "heif";
}

/**
 * For uploaded files — loads via <img> + object URL to normalize EXIF.
 */
export async function fileToBase64(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };
    img.src = objectUrl;
  });
}
