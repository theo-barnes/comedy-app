import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { z } from 'zod/v3';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import Constants from 'expo-constants';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/api/keys';
import { fetchProfile, updateProfileRole } from '@/lib/api/profiles';
import type { UserProfile, UserRole } from '@/types';
import { AuthContext } from '@/features/auth/context';

// ─── Zod guard — role must be one of the three valid values ──────────────────
const userRoleSchema = z.enum(['fan', 'comedian', 'venue']);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  // Role selected in-app before the DB row reflects it (social sign-up flow) —
  // merged over query data so the nav guard reacts immediately.
  const [optimisticRole, setOptimisticRole] = useState<UserRole | null>(null);
  // Dev-only local profile that bypasses Supabase entirely.
  const [devProfile, setDevProfile] = useState<UserProfile | null>(null);
  const queryClient = useQueryClient();

  // Prevent stale closure on profile fetch
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Profile is server state owned by React Query.
  const userId = user?.id;
  const profileQuery = useQuery({
    queryKey: queryKeys.profile(userId ?? 'anonymous'),
    queryFn: () => fetchProfile(userId as string),
    enabled: !!userId,
  });

  const profile = useMemo<UserProfile | null>(() => {
    if (devProfile) return devProfile;
    const data = profileQuery.data ?? null;
    if (!data) {
      // No DB row yet — surface an optimistically-set role rather than nothing
      // (can happen when the sign-up trigger hasn't committed yet).
      if (optimisticRole && user) {
        return {
          id: user.id,
          display_name: (user.user_metadata?.display_name as string) ?? '',
          role: optimisticRole,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      return null;
    }
    // DB row exists but role may be null if the trigger ran before the user
    // selected a role (social sign-up flow). Preserve any optimistic role.
    if (!data.role && optimisticRole) {
      return { ...data, role: optimisticRole };
    }
    return data;
  }, [devProfile, profileQuery.data, optimisticRole, user]);

  // The splash screen stays up until the session is restored AND, when signed
  // in, the first profile fetch settles — otherwise the role-selection guard
  // would flash for users who already have a role.
  const isLoading = isSessionLoading || (!!userId && !devProfile && profileQuery.isPending);

  // ── Bootstrap: load persisted session on mount ──────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s }, error }) => {
      if (!isMounted.current) return;
      // A stale/invalidated refresh token produces an AuthApiError here.
      // Sign out to clear the bad token so the user is returned to the login
      // screen cleanly rather than being stuck in a broken loading state.
      if (error) {
        await supabase.auth.signOut();
        setIsSessionLoading(false);
        return;
      }
      setSession(s);
      setUser(s?.user ?? null);
      setIsSessionLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!isMounted.current) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        // Token refresh / user update for the same user: refetch their profile.
        queryClient.invalidateQueries({ queryKey: queryKeys.profile(s.user.id) });
      } else {
        setOptimisticRole(null);
        queryClient.removeQueries({ queryKey: queryKeys.profiles });
      }
      // Clear guest mode when a real session arrives
      if (s) setIsGuest(false);
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const redirectTo = makeRedirectUri({
      native: 'cue://auth-callback',
      scheme: 'cue',
      path: 'auth-callback',
    });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });

    if (error || !data.url) throw error ?? new Error('No OAuth URL returned');

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (result.type === 'success') {
      const url = new URL(result.url);
      const code = url.searchParams.get('code');
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
      }
    }
  }, []);

  const signUp = useCallback(
    async (displayName: string, email: string, password: string, role: UserRole) => {
      // Validate role through Zod before it reaches Supabase — raw form data never
      // flows directly into user metadata (Gap 5 mitigation).
      const validatedRole = userRoleSchema.parse(role);
      // makeRedirectUri produces exp://LAN-IP in Expo Go which GoTrue Cloud
      // rejects. Skip emailRedirectTo in that environment — the confirmation
      // email still sends, linked to the project's site URL. In dev builds and
      // production the custom scheme is registered and the full PKCE flow works.
      const isExpoGo = !!Constants.expoGoConfig;
      const emailRedirectTo = isExpoGo
        ? undefined
        : makeRedirectUri({
            native: 'cue://auth-callback',
            scheme: 'cue',
            path: 'auth-callback',
          });

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
          data: { display_name: displayName, role: validatedRole },
        },
      });
      if (error) throw error;
    },
    [],
  );

  const updateUserRole = useCallback(
    async (role: UserRole) => {
      if (!user) throw new Error('No authenticated user');
      const validatedRole = userRoleSchema.parse(role);

      // Update auth user metadata — this is the authoritative source for role.
      const { error: metaError } = await supabase.auth.updateUser({
        data: { role: validatedRole },
      });
      if (metaError) throw metaError;

      // Best-effort sync to the profiles row (may affect 0 rows; the DB
      // enforces set-once immutability server-side).
      await updateProfileRole(user.id, validatedRole);

      // Optimistically expose the role so the nav guard re-evaluates
      // immediately, then refetch the canonical row.
      setOptimisticRole(validatedRole);
      queryClient.invalidateQueries({ queryKey: queryKeys.profile(user.id) });
    },
    [user, queryClient],
  );

  const signOut = useCallback(async () => {
    // Must call supabase.auth.signOut() — not just clear local state — to
    // invalidate the refresh token server-side immediately (Gap 7 mitigation).
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setIsGuest(false);
    setDevProfile(null);
  }, []);

  const continueAsGuest = useCallback(() => {
    // Guest state is intentionally not persisted — resets on app restart.
    setIsGuest(true);
  }, []);

  const exchangeCodeForSession = useCallback(async (code: string) => {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
  }, []);

  const resetPasswordForEmail = useCallback(async (email: string) => {
    // Fire-and-forget — always show success to prevent email enumeration.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'cue://auth-callback',
    });
  }, []);

  // ── Dev-only bypass ──────────────────────────────────────────────────────────
  // Directly patches local state so the router guard opens the app without any
  // Supabase call or email confirmation. No-op in production builds.
  const signInAsDevRole = useCallback((role: UserRole) => {
    if (!__DEV__) return;
    const validatedRole = userRoleSchema.parse(role);
    const label = validatedRole.charAt(0).toUpperCase() + validatedRole.slice(1);
    setDevProfile({
      id: 'dev-user',
      display_name: `Dev ${label}`,
      role: validatedRole,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setIsGuest(true);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        isLoading,
        isGuest,
        signInWithEmail,
        signInWithGoogle,
        signUp,
        signOut,
        continueAsGuest,
        exchangeCodeForSession,
        updateUserRole,
        resetPasswordForEmail,
        signInAsDevRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Re-export context for use in useAuth
export { AuthContext };
