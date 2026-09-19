import { createClient } from '@supabase/supabase-js';

import { env } from '@/lib/env';
import { LargeSecureStore } from '@/lib/large-secure-store';

export const supabase = createClient(
  env.EXPO_PUBLIC_SUPABASE_URL as string,
  env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string,
  {
    auth: {
      storage: LargeSecureStore,
      autoRefreshToken: true,
      persistSession: false,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  },
);
