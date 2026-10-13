import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export type NormalizeCaps = { maxBytes: number; maxPixels: number };

export type NormalizedImage = {
  uri: string;
  width: number;
  height: number;
};

type Step = { longEdge: number; compress: number; format: SaveFormat };

/**
 * Deterministic re-encode ladder. 4096 px covers every display surface (the
 * server's public rendition caps at 2048 px) while staying far below the
 * 25-megapixel decode cap; later steps only trade quality for byte size.
 */
const JPEG_STEPS: readonly Step[] = [
  { longEdge: 4096, compress: 0.85, format: SaveFormat.JPEG },
  { longEdge: 4096, compress: 0.7, format: SaveFormat.JPEG },
  { longEdge: 2048, compress: 0.7, format: SaveFormat.JPEG },
];

/** PNG keeps transparency; compression is lossless so only size steps help. */
const PNG_STEPS: readonly Step[] = [
  { longEdge: 4096, compress: 1, format: SaveFormat.PNG },
  { longEdge: 2048, compress: 1, format: SaveFormat.PNG },
];

function targetDimensions(
  width: number,
  height: number,
  longEdge: number,
  maxPixels: number,
): { width: number; height: number } | null {
  const scale = Math.min(
    1,
    longEdge / Math.max(width, height),
    Math.sqrt(maxPixels / (width * height)),
  );
  if (scale >= 1) return null;
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
  };
}

/**
 * Re-encodes a picked library image so it satisfies the poster contract
 * (JPEG/PNG/WebP, byte and pixel caps) without asking the user to export
 * anything. Sources the device can decode (HEIC/HEIF included) are rendered
 * to JPEG, or PNG when transparency must survive. The caller remains
 * responsible for final validation of the returned file.
 */
export async function normalizePoster(
  source: { uri: string; width: number; height: number },
  caps: NormalizeCaps,
  preserveTransparency: boolean,
): Promise<NormalizedImage> {
  if (
    !Number.isFinite(source.width) ||
    !Number.isFinite(source.height) ||
    source.width <= 0 ||
    source.height <= 0
  ) {
    throw new Error('events.poster.unreadable');
  }
  for (const step of preserveTransparency ? PNG_STEPS : JPEG_STEPS) {
    let saved: NormalizedImage;
    try {
      const context = ImageManipulator.manipulate(source.uri);
      const target = targetDimensions(source.width, source.height, step.longEdge, caps.maxPixels);
      if (target) context.resize(target);
      const image = await context.renderAsync();
      const result = await image.saveAsync({ compress: step.compress, format: step.format });
      saved = { uri: result.uri, width: result.width, height: result.height };
    } catch {
      // The platform could not decode or re-encode this image at all;
      // smaller steps cannot succeed either.
      throw new Error('events.poster.unreadable');
    }
    const size = new File(saved.uri).size;
    if (Number.isFinite(size) && size > 0 && size <= caps.maxBytes) return saved;
  }
  throw new Error('events.poster.tooLarge');
}
