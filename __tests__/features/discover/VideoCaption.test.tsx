import { fireEvent, screen } from '@testing-library/react-native';

import { VideoCaption } from '@/features/discover/components/VideoCaption';

import { renderWithTheme } from '../../utils/renderWithTheme';

describe('VideoCaption', () => {
  it('opens the uploader profile when a creator press handler is supplied', () => {
    const onCreatorPress = jest.fn();
    renderWithTheme(<VideoCaption creatorName="Jo King" onCreatorPress={onCreatorPress} />);

    fireEvent.press(screen.getByRole('button', { name: "View Jo King's profile" }));
    expect(onCreatorPress).toHaveBeenCalledTimes(1);
  });
});
