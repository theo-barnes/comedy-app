import { fireEvent, render, screen } from '@testing-library/react-native';
import { TextInput } from 'react-native';
import type { FieldError } from 'react-hook-form';

import { PasswordInput } from '@/components/PasswordInput';

describe('PasswordInput', () => {
  it('renders the label', () => {
    render(<PasswordInput label="Password" />);
    expect(screen.getByText('Password')).toBeTruthy();
  });

  it('masks the input by default (secureTextEntry = true)', () => {
    render(<PasswordInput label="Password" />);
    const input = screen.UNSAFE_getByType(TextInput);
    expect(input.props.secureTextEntry).toBe(true);
  });

  it('reveals the input after pressing the eye icon', () => {
    render(<PasswordInput label="Password" />);
    // Icon mock renders name as Text content; fireEvent bubbles to the Pressable.
    fireEvent.press(screen.getByText('eye-outline'));
    const input = screen.UNSAFE_getByType(TextInput);
    expect(input.props.secureTextEntry).toBe(false);
  });

  it('hides the input again after pressing the eye icon twice', () => {
    render(<PasswordInput label="Password" />);
    fireEvent.press(screen.getByText('eye-outline'));
    // After first press the icon flips to eye-off-outline
    fireEvent.press(screen.getByText('eye-off-outline'));
    const input = screen.UNSAFE_getByType(TextInput);
    expect(input.props.secureTextEntry).toBe(true);
  });

  it('renders error message when error prop is provided', () => {
    const error: FieldError = { type: 'required', message: 'Password is required' };
    render(<PasswordInput label="Password" error={error} />);
    expect(screen.getByText('Password is required')).toBeTruthy();
  });
});
