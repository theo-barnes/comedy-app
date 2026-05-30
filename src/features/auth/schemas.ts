import { z } from 'zod/v3';
import type { TFunction } from 'i18next';

export function createSignInSchema(t: TFunction) {
  return z.object({
    email: z.string().email(t('auth.validation.emailInvalid')),
    password: z.string().min(1, t('auth.validation.passwordRequired')),
  });
}

export function createSignUpSchema(t: TFunction) {
  return z.object({
    displayName: z.string().min(1, t('auth.validation.nameRequired')).max(100),
    email: z.string().email(t('auth.validation.emailInvalid')),
    password: z
      .string()
      .min(8, t('auth.validation.passwordMin'))
      .max(128, t('auth.validation.passwordMax'))
      .regex(/[^0-9]/, t('auth.validation.passwordNonNumeric')),
  });
}

export function createForgotSchema(t: TFunction) {
  return z.object({
    email: z.string().email(t('auth.validation.emailInvalid')),
  });
}
