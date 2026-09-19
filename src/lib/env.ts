import { z } from 'zod/v3';

const supabaseUrlSchema = z
  .string()
  .url()
  .refine((value) => value !== 'https://your-project-ref.supabase.co', {
    message: 'Replace the placeholder Supabase URL with your project URL',
  });

const supabaseAnonKeySchema = z
  .string()
  .min(1)
  .refine((value) => value !== 'your-anon-key-here', {
    message: 'Replace the placeholder Supabase anon key with your project key',
  });

const envSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: supabaseUrlSchema,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKeySchema,
  EXPO_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  EXPO_PUBLIC_DISCOVERY_API_URL: z.string().url().optional(),
  EXPO_PUBLIC_API_URL: z.string().url().optional(),
});

export const env = envSchema.parse({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN || undefined,
  EXPO_PUBLIC_DISCOVERY_API_URL: process.env.EXPO_PUBLIC_DISCOVERY_API_URL || undefined,
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || undefined,
});
