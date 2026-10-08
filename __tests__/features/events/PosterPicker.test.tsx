import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { PosterPicker, PosterProgress } from '@/features/events/PosterPicker';
import { renderWithTheme } from '../../utils/renderWithTheme';

const mockPick = jest.fn();
jest.mock('@/features/events/poster-picker', () => ({
  pickPoster: (...args: unknown[]) => mockPick(...args),
}));
const selection = {
  uri: 'file:///old.jpg',
  contentType: 'image/jpeg' as const,
  width: 100,
  height: 200,
  fileSize: 1000,
};
const limits = {
  maxBytes: 10_485_760,
  maxPixels: 25_000_000,
  supportedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
};

beforeEach(() => jest.clearAllMocks());

it('keeps the old selection when the native picker is cancelled', async () => {
  const onChange = jest.fn();
  mockPick.mockResolvedValue(null);
  renderWithTheme(<PosterPicker selection={selection} onChange={onChange} limits={limits} />);
  fireEvent.press(screen.getByText('events.poster.reselect'));
  await waitFor(() => expect(mockPick).toHaveBeenCalledTimes(1));
  expect(screen.getByLabelText('events.poster.selectedPreview').props.source.uri).toBe(
    selection.uri,
  );
  expect(onChange).not.toHaveBeenCalled();
});

it('surfaces a thrown permission error while retaining the previous selection', async () => {
  mockPick.mockRejectedValue(new Error('Permission denied'));
  const onChange = jest.fn();
  renderWithTheme(<PosterPicker selection={selection} onChange={onChange} limits={limits} />);
  fireEvent.press(screen.getByText('events.poster.reselect'));
  await screen.findByText('events.poster.pickerFailed');
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByLabelText('events.poster.selectedPreview')).toBeTruthy();
});

it('shows preliminary validation errors and exposes an explicit selection removal', async () => {
  mockPick.mockRejectedValue(new Error('events.poster.tooLarge'));
  const onChange = jest.fn();
  renderWithTheme(<PosterPicker selection={selection} onChange={onChange} limits={limits} />);
  fireEvent.press(screen.getByText('events.poster.reselect'));
  await screen.findByText('events.poster.tooLarge');
  fireEvent.press(screen.getByText('events.poster.clearSelection'));
  expect(onChange).toHaveBeenCalledWith(null);
});

it('makes failed preview rendering visible, not an invisible broken image', () => {
  renderWithTheme(<PosterPicker selection={selection} onChange={jest.fn()} limits={limits} />);
  fireEvent(screen.getByLabelText('events.poster.selectedPreview'), 'error');
  expect(screen.getByText('events.poster.imageUnavailable')).toBeTruthy();
  expect(screen.getByText('events.poster.reselect')).toBeTruthy();
});

it('shows upload, processing and attaching stages and permits cancellation only during upload', () => {
  const onCancel = jest.fn();
  const view = renderWithTheme(
    <PosterProgress status="uploading" progress={0.5} onCancel={onCancel} />,
  );
  expect(screen.getByText('events.poster.uploading')).toBeTruthy();
  fireEvent.press(screen.getByText('common.cancel'));
  expect(onCancel).toHaveBeenCalledTimes(1);
  view.rerender(<PosterProgress status="processing" progress={1} onCancel={onCancel} />);
  expect(screen.getByText('events.poster.processing')).toBeTruthy();
  expect(screen.queryByText('common.cancel')).toBeNull();
  view.rerender(<PosterProgress status="attaching" progress={1} onCancel={onCancel} />);
  expect(screen.getByText('events.poster.attaching')).toBeTruthy();
});
