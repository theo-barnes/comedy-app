import * as ImagePicker from 'expo-image-picker';

import { normalizePoster } from '@/features/events/poster-normalize';
import {
  pickPoster,
  posterLimits,
  validatePosterBytes,
  validatePosterFile,
} from '@/features/events/poster-picker';

type MockFile = { size: number; type: string; bytes: jest.Mock };
const mockFileStore = new Map<string, MockFile>();
jest.mock('expo-file-system', () => ({
  File: jest.fn((uri: string) => mockFileStore.get(uri) ?? { size: 0, type: '', bytes: jest.fn() }),
}));
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  UIImagePickerPreferredAssetRepresentationMode: { Compatible: 'compatible' },
}));
jest.mock('@/features/events/poster-normalize', () => ({ normalizePoster: jest.fn() }));

const picker = jest.mocked(ImagePicker.launchImageLibraryAsync);
const normalize = jest.mocked(normalizePoster);
const asset = { uri: 'file:///poster', width: 200, height: 300 };
const caps = { maxBytes: posterLimits.maxBytes, maxPixels: posterLimits.maxPixels };

const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0x00]);
const heicBytes = new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 104, 101, 105, 99]);

function pngBytes(colorType: number, extraChunk: number[] = []) {
  // Signature + minimal IHDR (1x1, bit depth 8) + optional chunk.
  return new Uint8Array([
    137,
    80,
    78,
    71,
    13,
    10,
    26,
    10,
    0,
    0,
    0,
    13,
    73,
    72,
    68,
    82,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    1,
    8,
    colorType,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    ...extraChunk,
  ]);
}
const idatChunk = [0, 0, 0, 0, 73, 68, 65, 84, 0, 0, 0, 0];
const actlChunk = [0, 0, 0, 8, 97, 99, 84, 76, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

function addFile(uri: string, file: { size: number; type: string; bytes: Uint8Array }): MockFile {
  const entry = {
    size: file.size,
    type: file.type,
    bytes: jest.fn().mockResolvedValue(file.bytes),
  };
  mockFileStore.set(uri, entry);
  return entry;
}

function pickReturns(extra: Partial<ImagePicker.ImagePickerAsset>) {
  picker.mockResolvedValue({ canceled: false, assets: [{ ...asset, ...extra }] });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFileStore.clear();
  addFile('file:///normalized.jpg', { size: 2_000_000, type: 'image/jpeg', bytes: jpegBytes });
  normalize.mockResolvedValue({ uri: 'file:///normalized.jpg', width: 4032, height: 3024 });
});

it('uploads compliant originals unchanged, compatible iOS output, no forced crop', async () => {
  pickReturns({ mimeType: 'image/jpeg' });
  addFile(asset.uri, { size: 100, type: 'image/jpeg', bytes: jpegBytes });
  expect(await pickPoster()).toEqual({ ...asset, contentType: 'image/jpeg', fileSize: 100 });
  expect(normalize).not.toHaveBeenCalled();
  expect(picker).toHaveBeenCalledWith(
    expect.objectContaining({
      allowsEditing: false,
      quality: 1,
      mediaTypes: ['images'],
      preferredAssetRepresentationMode: 'compatible',
    }),
  );
});

it('returns cancellation without replacing an existing selection', async () => {
  picker.mockResolvedValue({ canceled: true, assets: null });
  expect(await pickPoster()).toBeNull();
  expect(normalize).not.toHaveBeenCalled();
});

it('normalizes HEIC photos to an uploadable JPEG instead of rejecting them', async () => {
  pickReturns({ mimeType: 'image/heic', width: 4032, height: 3024 });
  addFile(asset.uri, { size: 5_000_000, type: 'image/heic', bytes: heicBytes });
  expect(await pickPoster()).toEqual({
    uri: 'file:///normalized.jpg',
    width: 4032,
    height: 3024,
    contentType: 'image/jpeg',
    fileSize: 2_000_000,
  });
  expect(normalize).toHaveBeenCalledWith(
    { uri: asset.uri, width: 4032, height: 3024 },
    caps,
    false,
  );
});

it('normalizes oversized and over-pixel photos instead of rejecting them', async () => {
  pickReturns({ mimeType: 'image/jpeg', width: 8000, height: 6000 });
  addFile(asset.uri, { size: posterLimits.maxBytes + 1, type: 'image/jpeg', bytes: jpegBytes });
  const selection = await pickPoster();
  expect(selection?.contentType).toBe('image/jpeg');
  expect(normalize).toHaveBeenCalledWith(
    { uri: asset.uri, width: 8000, height: 6000 },
    caps,
    false,
  );
});

it('re-encodes when the picker claim disagrees with the file facts', async () => {
  pickReturns({ mimeType: 'image/png' });
  addFile(asset.uri, { size: 100, type: 'image/jpeg', bytes: jpegBytes });
  const selection = await pickPoster();
  expect(selection?.uri).toBe('file:///normalized.jpg');
  expect(normalize).toHaveBeenCalled();
});

it('re-encodes a masquerading container that passes the fast-path facts', async () => {
  pickReturns({ mimeType: 'image/jpeg' });
  addFile(asset.uri, { size: 100, type: 'image/jpeg', bytes: pngBytes(2, idatChunk) });
  const selection = await pickPoster();
  expect(selection?.uri).toBe('file:///normalized.jpg');
  expect(normalize).toHaveBeenCalledWith(expect.anything(), caps, false);
});

it('still rejects animated sources instead of silently flattening them', async () => {
  pickReturns({ mimeType: 'image/png', width: 8000, height: 6000 });
  addFile(asset.uri, {
    size: posterLimits.maxBytes + 1,
    type: 'image/png',
    bytes: pngBytes(2, actlChunk),
  });
  await expect(pickPoster()).rejects.toThrow('events.poster.animated');
  expect(normalize).not.toHaveBeenCalled();
});

it('preserves transparency when normalizing an oversized PNG', async () => {
  pickReturns({ mimeType: 'image/png', width: 8000, height: 6000 });
  addFile(asset.uri, {
    size: posterLimits.maxBytes + 1,
    type: 'image/png',
    bytes: pngBytes(6, idatChunk),
  });
  addFile('file:///normalized.png', {
    size: 6_000_000,
    type: 'image/png',
    bytes: pngBytes(6, idatChunk),
  });
  normalize.mockResolvedValue({ uri: 'file:///normalized.png', width: 4096, height: 3072 });
  const selection = await pickPoster();
  expect(selection?.contentType).toBe('image/png');
  expect(normalize).toHaveBeenCalledWith(expect.anything(), caps, true);
});

it('validates the normalized output as the final gate', async () => {
  pickReturns({ mimeType: 'image/heic' });
  addFile(asset.uri, { size: 5_000_000, type: 'image/heic', bytes: heicBytes });
  addFile('file:///normalized.jpg', {
    size: posterLimits.maxBytes + 1,
    type: 'image/jpeg',
    bytes: jpegBytes,
  });
  await expect(pickPoster()).rejects.toThrow('events.poster.tooLarge');
});

it('accepts exact byte/pixel limits and rejects either excess', () => {
  const edge = { ...asset, width: 5000, height: 5000 };
  expect(validatePosterFile(edge, { size: posterLimits.maxBytes, type: 'image/png' })).toBeTruthy();
  expect(() =>
    validatePosterFile(edge, { size: posterLimits.maxBytes + 1, type: 'image/png' }),
  ).toThrow('events.poster.tooLarge');
  expect(() =>
    validatePosterFile({ ...edge, width: 5001 }, { size: 100, type: 'image/png' }),
  ).toThrow('events.poster.tooManyPixels');
});

it('honours smaller server limits without accepting larger configured limits', () => {
  expect(() =>
    validatePosterFile(
      asset,
      { size: 101, type: 'image/jpeg' },
      { ...posterLimits, maxBytes: 100 },
    ),
  ).toThrow('events.poster.tooLarge');
  expect(() =>
    validatePosterFile(
      asset,
      { size: posterLimits.maxBytes + 1, type: 'image/jpeg' },
      { ...posterLimits, maxBytes: 50_000_000 },
    ),
  ).toThrow('events.poster.tooLarge');
});

it('rejects mismatched bytes and animated PNG/WebP containers', () => {
  expect(() => validatePosterBytes(new Uint8Array([0, 1]), 'image/jpeg')).toThrow(
    'events.poster.unsupported',
  );
  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 8, 97, 99, 84, 76]);
  expect(() => validatePosterBytes(png, 'image/png')).toThrow('events.poster.animated');
  const webp = new Uint8Array([
    ...Buffer.from('RIFF'),
    0,
    0,
    0,
    0,
    ...Buffer.from('WEBPANIM'),
    0,
    0,
    0,
    0,
  ]);
  expect(() => validatePosterBytes(webp, 'image/webp')).toThrow('events.poster.animated');
});
