import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { normalizePoster } from './poster-normalize';
import type { PosterSelection } from './poster-upload';

export type PosterLimits = {
  maxBytes: number;
  maxPixels: number;
  supportedContentTypes: string[];
};

export const posterLimits: PosterLimits = {
  maxBytes: 10 * 1024 * 1024,
  maxPixels: 25_000_000,
  supportedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
};

function ascii(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

/** Preliminary checks only; the server validates and decodes the actual upload. */
export function validatePosterFile(
  asset: Pick<PosterSelection, 'uri' | 'width' | 'height'>,
  file: { size: number; type: string },
  limits: PosterLimits = posterLimits,
): PosterSelection {
  const contentType = file.type;
  if (
    (contentType !== 'image/jpeg' && contentType !== 'image/png' && contentType !== 'image/webp') ||
    !limits.supportedContentTypes.includes(contentType)
  ) {
    throw new Error('events.poster.unsupported');
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    throw new Error('events.poster.unreadable');
  }
  if (file.size > Math.min(limits.maxBytes, posterLimits.maxBytes)) {
    throw new Error('events.poster.tooLarge');
  }
  if (
    !Number.isInteger(asset.width) ||
    !Number.isInteger(asset.height) ||
    asset.width <= 0 ||
    asset.height <= 0 ||
    asset.width * asset.height > Math.min(limits.maxPixels, posterLimits.maxPixels)
  ) {
    throw new Error('events.poster.tooManyPixels');
  }
  return {
    ...asset,
    fileSize: file.size,
    contentType,
  };
}

function detectContainer(bytes: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) {
    return 'image/png';
  }
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return 'image/webp';
  return null;
}

function assertStillImage(bytes: Uint8Array, container: 'image/png' | 'image/webp') {
  const png = container === 'image/png';
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = png ? 8 : 12; offset + 8 <= bytes.length; ) {
    const length = view.getUint32(png ? offset : offset + 4, !png);
    const kind = ascii(bytes, png ? offset + 4 : offset, 4);
    if (kind === 'acTL' || kind === 'ANIM' || kind === 'ANMF') {
      throw new Error('events.poster.animated');
    }
    if (!png && kind === 'VP8X' && ((bytes[offset + 8] ?? 0) & 2) !== 0) {
      throw new Error('events.poster.animated');
    }
    offset += png ? length + 12 : length + 8 + (length % 2);
  }
}

/** Whether a PNG or WebP container carries transparency that JPEG would lose. */
function hasTransparency(bytes: Uint8Array, container: 'image/png' | 'image/webp') {
  if (container === 'image/png') {
    // IHDR colour type: 4 (grey+alpha) and 6 (truecolour+alpha) carry an
    // alpha channel; other types only via a tRNS chunk, found below.
    if (bytes[25] === 4 || bytes[25] === 6) return true;
  }
  const png = container === 'image/png';
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = png ? 8 : 12; offset + 8 <= bytes.length; ) {
    const length = view.getUint32(png ? offset : offset + 4, !png);
    const kind = ascii(bytes, png ? offset + 4 : offset, 4);
    if (png && kind === 'tRNS') return true;
    if (png && (kind === 'IDAT' || kind === 'IEND')) return false;
    if (!png && kind === 'VP8X' && ((bytes[offset + 8] ?? 0) & 0x10) !== 0) return true;
    if (!png && kind === 'VP8L') {
      // Lossless bitstream header: alpha_is_used is bit 4 of the 5th data byte.
      return ((bytes[offset + 12] ?? 0) & 0x10) !== 0;
    }
    if (!png && kind === 'ALPH') return true;
    offset += png ? length + 12 : length + 8 + (length % 2);
  }
  return false;
}

export function validatePosterBytes(
  bytes: Uint8Array,
  contentType: PosterSelection['contentType'],
) {
  if (detectContainer(bytes) !== contentType) {
    throw new Error('events.poster.unsupported');
  }
  if (contentType !== 'image/jpeg') assertStillImage(bytes, contentType);
}

export async function pickPoster(
  limits: PosterLimits = posterLimits,
): Promise<PosterSelection | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    allowsMultipleSelection: false,
    quality: 1,
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) throw new Error('events.poster.unreadable');
  const caps = {
    maxBytes: Math.min(limits.maxBytes, posterLimits.maxBytes),
    maxPixels: Math.min(limits.maxPixels, posterLimits.maxPixels),
  };
  const file = new File(asset.uri);
  const claimed = asset.mimeType?.toLowerCase() ?? file.type;

  // Fast path: the original already satisfies the contract byte-for-byte.
  // Both the picker's claim and the on-disk facts must agree; the actual
  // container bytes are still the deciding evidence.
  if (
    claimed === file.type &&
    limits.supportedContentTypes.includes(claimed) &&
    posterLimits.supportedContentTypes.includes(claimed) &&
    file.size > 0 &&
    file.size <= caps.maxBytes &&
    asset.width * asset.height <= caps.maxPixels
  ) {
    try {
      const selection = validatePosterFile(
        { uri: asset.uri, width: asset.width, height: asset.height },
        file,
        limits,
      );
      validatePosterBytes(await file.bytes(), selection.contentType);
      return selection;
    } catch (failure) {
      // A masquerading container (for example HEIC named .jpg) falls through
      // to normalization; genuine policy failures still surface.
      if (failure instanceof Error && failure.message === 'events.poster.animated') throw failure;
    }
  }

  // Seamless path: transcode and downscale on-device (HEIC/HEIF, oversized or
  // over-pixel photos). Animated stills stay rejected and transparency is
  // preserved, so inspect the source container first when it is readable.
  let preserveTransparency = false;
  const sourceBytes = await file.bytes().catch(() => null);
  if (sourceBytes) {
    const container = detectContainer(sourceBytes);
    if (container && container !== 'image/jpeg') {
      assertStillImage(sourceBytes, container);
      preserveTransparency = hasTransparency(sourceBytes, container);
    }
  }
  const normalized = await normalizePoster(
    { uri: asset.uri, width: asset.width, height: asset.height },
    caps,
    preserveTransparency,
  );
  const normalizedFile = new File(normalized.uri);
  const selection = validatePosterFile(
    { uri: normalized.uri, width: normalized.width, height: normalized.height },
    normalizedFile,
    limits,
  );
  validatePosterBytes(await normalizedFile.bytes(), selection.contentType);
  return selection;
}
