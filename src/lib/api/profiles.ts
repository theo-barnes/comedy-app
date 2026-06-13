/**
 * Profile data access.
 *
 * This module is part of the app's data-access seam (`src/lib/api/`): all
 * reads/writes to backend data go through these typed functions, never through
 * direct `supabase.from(...)` calls in components or providers. When parts of
 * the backend move behind a dedicated API service, only this layer changes.
 */
import { supabase } from '@/lib/supabase';
import type { UserProfile, UserRole } from '@/types';

/**
 * Fetch the profile row for a user. Returns `null` when the row does not exist
 * yet (the auth trigger may not have committed for brand-new sign-ups).
 */
export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Best-effort sync of the user's role to the profiles row.
 *
 * Auth metadata is the authoritative source for role; the DB enforces
 * set-once immutability via trigger + RLS. This may affect 0 rows (row not
 * created yet) — that is acceptable and not an error.
 */
export async function updateProfileRole(userId: string, role: UserRole): Promise<void> {
  await supabase.from('profiles').update({ role }).eq('id', userId);
}
