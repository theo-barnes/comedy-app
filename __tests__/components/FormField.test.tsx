import { render, screen } from '@testing-library/react-native';
import type { FieldError } from 'react-hook-form';

import { FormField } from '@/components/FormField';

describe('FormField', () => {
  it('renders the label', () => {
    render(<FormField label="Email" />);
    expect(screen.getByText('Email')).toBeTruthy();
  });

  it('renders the error message when error is provided', () => {
    const error: FieldError = { type: 'required', message: 'Email is required' };
    render(<FormField label="Email" error={error} />);
    expect(screen.getByText('Email is required')).toBeTruthy();
  });

  it('does not render an error when error is undefined', () => {
    render(<FormField label="Email" />);
    expect(screen.queryByText('Email is required')).toBeNull();
  });
});
