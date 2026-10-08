import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

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

export function validatePosterBytes(
  bytes: Uint8Array,
  contentType: PosterSelection['contentType'],
) {
  if (contentType === 'image/jpeg') {
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
      throw new Error('events.poster.unsupported');
    }
    return;
  }
  const png = contentType === 'image/png';
  if (
    png
      ? ![137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)
      : ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'WEBP'
  ) {
    throw new Error('events.poster.unsupported');
  }
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
  const file = new File(asset.uri);
  const selection = validatePosterFile(
    { uri: asset.uri, width: asset.width, height: asset.height },
    file,
    limits,
  );
  validatePosterBytes(await file.bytes(), selection.contentType);
  return selection;
}
