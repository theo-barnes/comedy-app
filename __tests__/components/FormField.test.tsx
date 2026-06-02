import { screen } from '@testing-library/react-native';
import { renderWithTheme } from '../utils/renderWithTheme';
import type { FieldError } from 'react-hook-form';

import { FormField } from '@/components/FormField';

describe('FormField', () => {
  it('renders the label', () => {
    renderWithTheme(<FormField label="Email" />);
    expect(screen.getByText('Email')).toBeTruthy();
  });

  it('renders the error message when error is provided', () => {
    const error: FieldError = { type: 'required', message: 'Email is required' };
    renderWithTheme(<FormField label="Email" error={error} />);
    expect(screen.getByText('Email is required')).toBeTruthy();
  });

  it('does not render an error when error is undefined', () => {
    renderWithTheme(<FormField label="Email" />);
    expect(screen.queryByText('Email is required')).toBeNull();
  });
});
