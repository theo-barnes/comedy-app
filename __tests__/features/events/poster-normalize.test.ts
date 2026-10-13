import { normalizePoster } from '@/features/events/poster-normalize';

const mockFiles = new Map<string, { size: number }>();
jest.mock('expo-file-system', () => ({
  File: jest.fn((uri: string) => mockFiles.get(uri) ?? { size: 0 }),
}));

const saveAsync = jest.fn();
const renderAsync = jest.fn();
const resize = jest.fn();
const mockManipulate = jest.fn();
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
  ImageManipulator: { manipulate: (uri: string) => mockManipulate(uri) },
}));

const caps = { maxBytes: 10 * 1024 * 1024, maxPixels: 25_000_000 };

function saved(uri: string, width: number, height: number, size: number) {
  mockFiles.set(uri, { size });
  return { uri, width, height };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFiles.clear();
  mockManipulate.mockReturnValue({ resize, renderAsync });
  renderAsync.mockResolvedValue({ saveAsync });
});

it('downscales a 48 MP photo to a 4096px JPEG in one pass', async () => {
  saveAsync.mockResolvedValue(saved('file:///n1.jpg', 4096, 3072, 2_000_000));
  const result = await normalizePoster(
    { uri: 'file:///src', width: 8000, height: 6000 },
    caps,
    false,
  );
  expect(result).toEqual({ uri: 'file:///n1.jpg', width: 4096, height: 3072 });
  expect(mockManipulate).toHaveBeenCalledTimes(1);
  expect(mockManipulate).toHaveBeenCalledWith('file:///src');
  expect(resize).toHaveBeenCalledWith({ width: 4096, height: 3072 });
  expect(saveAsync).toHaveBeenCalledWith({ compress: 0.85, format: 'jpeg' });
});

it('transcodes small sources without resizing', async () => {
  saveAsync.mockResolvedValue(saved('file:///n1.jpg', 1000, 800, 500_000));
  await normalizePoster({ uri: 'file:///heic', width: 1000, height: 800 }, caps, false);
  expect(resize).not.toHaveBeenCalled();
  expect(saveAsync).toHaveBeenCalledWith({ compress: 0.85, format: 'jpeg' });
});

it('honours a pixel cap tighter than the edge cap', async () => {
  saveAsync.mockResolvedValue(saved('file:///n1.jpg', 1154, 866, 300_000));
  await normalizePoster(
    { uri: 'file:///src', width: 4000, height: 3000 },
    { ...caps, maxPixels: 1_000_000 },
    false,
  );
  expect(resize).toHaveBeenCalledWith({ width: 1154, height: 866 });
});

it('steps down quality then size until the byte cap fits', async () => {
  saveAsync
    .mockResolvedValueOnce(saved('file:///n1.jpg', 4096, 3072, caps.maxBytes + 1))
    .mockResolvedValueOnce(saved('file:///n2.jpg', 4096, 3072, caps.maxBytes + 1))
    .mockResolvedValueOnce(saved('file:///n3.jpg', 2048, 1536, 4_000_000));
  const result = await normalizePoster(
    { uri: 'file:///src', width: 8000, height: 6000 },
    caps,
    false,
  );
  expect(result.uri).toBe('file:///n3.jpg');
  expect(saveAsync).toHaveBeenNthCalledWith(2, { compress: 0.7, format: 'jpeg' });
  expect(saveAsync).toHaveBeenNthCalledWith(3, { compress: 0.7, format: 'jpeg' });
  expect(resize).toHaveBeenLastCalledWith({ width: 2048, height: 1536 });
});

it('keeps PNG format and lossless compression for transparent sources', async () => {
  saveAsync.mockResolvedValue(saved('file:///n1.png', 4096, 2048, 6_000_000));
  await normalizePoster({ uri: 'file:///src', width: 8192, height: 4096 }, caps, true);
  expect(saveAsync).toHaveBeenCalledWith({ compress: 1, format: 'png' });
});

it('fails honestly when no step reaches the byte cap', async () => {
  saveAsync.mockResolvedValue(saved('file:///n.jpg', 2048, 1536, caps.maxBytes + 1));
  await expect(
    normalizePoster({ uri: 'file:///src', width: 8000, height: 6000 }, caps, false),
  ).rejects.toThrow('events.poster.tooLarge');
  expect(saveAsync).toHaveBeenCalledTimes(3);
});

it('reports unreadable sources without retrying smaller steps', async () => {
  renderAsync.mockRejectedValue(new Error('decode failed'));
  await expect(
    normalizePoster({ uri: 'file:///corrupt', width: 100, height: 100 }, caps, false),
  ).rejects.toThrow('events.poster.unreadable');
  expect(mockManipulate).toHaveBeenCalledTimes(1);
});

it('rejects invalid dimensions before touching the manipulator', async () => {
  await expect(
    normalizePoster({ uri: 'file:///x', width: 0, height: 100 }, caps, false),
  ).rejects.toThrow('events.poster.unreadable');
  expect(mockManipulate).not.toHaveBeenCalled();
});
