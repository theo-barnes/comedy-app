import type { PropsWithChildren } from 'react';
import type { FieldError } from 'react-hook-form';

import { AppText } from '@/components/AppText';
import { createAuthStyles } from '@/features/auth/authStyles';
import { useThemedStyles } from '@/hooks/useThemedStyles';

type Props = PropsWithChildren<{
  label: string;
  error?: FieldError;
}>;

/**
 * Shared label + validation-error chrome for form inputs.
 * Wrap the input control itself as children.
 */
export function FieldWrapper({ label, error, children }: Props) {
  const authStyles = useThemedStyles(createAuthStyles);
  return (
    <>
      <AppText variant="caption" muted style={authStyles.label}>
        {label}
      </AppText>
      {children}
      {error && (
        <AppText variant="caption" style={authStyles.fieldError}>
          {error.message}
        </AppText>
      )}
    </>
  );
}
