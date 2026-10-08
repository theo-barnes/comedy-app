import * as ImagePicker from 'expo-image-picker';

import {
  pickPoster,
  posterLimits,
  validatePosterBytes,
  validatePosterFile,
} from '@/features/events/poster-picker';

const mockFile = { size: 100, type: 'image/jpeg', bytes: jest.fn() };
jest.mock('expo-file-system', () => ({ File: jest.fn(() => mockFile) }));
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  UIImagePickerPreferredAssetRepresentationMode: { Compatible: 'compatible' },
}));
const asset = { uri: 'file:///poster', width: 200, height: 300 };
const picker = jest.mocked(ImagePicker.launchImageLibraryAsync);

beforeEach(() => {
  jest.clearAllMocks();
  mockFile.size = 100;
  mockFile.type = 'image/jpeg';
  mockFile.bytes.mockResolvedValue(new Uint8Array([0xff, 0xd8, 0xff]));
});

it('uses actual file type and size, compatible iOS output and no forced crop', async () => {
  picker.mockResolvedValue({
    canceled: false,
    assets: [
      {
        ...asset,
        fileSize: 1,
        mimeType: 'image/png',
      },
    ],
  });
  expect(await pickPoster()).toEqual({ ...asset, contentType: 'image/jpeg', fileSize: 100 });
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
  expect(mockFile.bytes).not.toHaveBeenCalled();
});

it.each(['image/heic', 'image/svg+xml', 'image/gif', 'application/octet-stream'])(
  'rejects unconverted %s regardless of picker claims',
  (type) =>
    expect(() => validatePosterFile(asset, { size: 100, type })).toThrow(
      'events.poster.unsupported',
    ),
);

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
