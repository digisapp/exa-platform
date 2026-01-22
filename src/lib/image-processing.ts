import sharp from "sharp";

/**
 * Process an image to remove EXIF data and optionally resize
 * EXIF data can contain sensitive information like GPS location
 */
export async function processImage(
  buffer: Buffer | Uint8Array,
  options?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: "jpeg" | "png" | "webp";
  }
): Promise<{ buffer: Buffer; contentType: string }> {
  const {
    maxWidth = 2048,
    maxHeight = 2048,
    quality = 85,
    format,
  } = options || {};

  let image = sharp(buffer);

  // Get metadata to determine orientation and format
  const metadata = await image.metadata();

  // Remove EXIF data by not preserving metadata
  // This automatically removes GPS, camera info, etc.
  image = image.rotate(); // Auto-rotate based on EXIF orientation before stripping

  // Resize if larger than max dimensions
  if (metadata.width && metadata.height) {
    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      image = image.resize(maxWidth, maxHeight, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }
  }

  // Determine output format
  let outputFormat = format;
  let contentType: string;

  if (!outputFormat) {
    // Preserve original format if possible, default to jpeg
    switch (metadata.format) {
      case "png":
        outputFormat = "png";
        break;
      case "webp":
        outputFormat = "webp";
        break;
      default:
        outputFormat = "jpeg";
    }
  }

  // Convert to output format
  switch (outputFormat) {
    case "png":
      image = image.png({ quality });
      contentType = "image/png";
      break;
    case "webp":
      image = image.webp({ quality });
      contentType = "image/webp";
      break;
    default:
      image = image.jpeg({ quality, mozjpeg: true });
      contentType = "image/jpeg";
  }

  const outputBuffer = await image.toBuffer();

  return {
    buffer: outputBuffer,
    contentType,
  };
}

/**
 * Check if a file type is a processable image
 */
export function isProcessableImage(mimeType: string): boolean {
  return ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mimeType);
}
