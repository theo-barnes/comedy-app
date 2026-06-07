import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { z } from 'zod/v3';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import Constants from 'expo-constants';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { UserProfile, UserRole } from '@/types';
import { AuthContext, type AuthContextValue } from '@/features/auth/context';

// ─── Zod guard — role must be one of the three valid values ──────────────────
const userRoleSchema = z.enum(['fan', 'comedian', 'venue']);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  // Prevent stale closure on profile fetch
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (isMounted.current) {
      setProfile((prev) => {
        if (!data) {
          // No DB row yet — preserve an optimistically-set role rather than
          // resetting to null (can happen when trigger hasn't committed yet).
          return prev?.role ? prev : null;
        }
        // DB row exists but role may be null if the trigger ran before the user
        // selected a role (social sign-up flow). Preserve any optimistic role.
        if (!data.role && prev?.role) {
          return { ...data, role: prev.role };
        }
        return data;
      });
    }
  }, []);

  // ── Bootstrap: load persisted session on mount ──────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s }, error }) => {
      if (!isMounted.current) return;
      // A stale/invalidated refresh token produces an AuthApiError here.
      // Sign out to clear the bad token so the user is returned to the login
      // screen cleanly rather than being stuck in a broken loading state.
      if (error) {
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }
      // DEV ONLY: force sign-in on every launch so auth flows can be tested
      // without manually signing out. Remove before shipping.
      if (__DEV__ && s) {
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) await fetchProfile(s.user.id);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!isMounted.current) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id);
      } else {
        setProfile(null);
      }
      // Clear guest mode when a real session arrives
      if (s) setIsGuest(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const redirectTo = makeRedirectUri({
      native: 'billd-tonight://auth-callback',
      scheme: 'billd-tonight',
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
            native: 'billd-tonight://auth-callback',
            scheme: 'billd-tonight',
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

  const signInWithApple = useCallback(async () => {
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) return;

    // Generate a cryptographically random nonce.
    // rawNonce (hex string) is what Supabase verifies; hashedNonce (SHA-256) is
    // what Apple embeds in the identity token — prevents replay attacks.
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    const rawNonce = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce,
    );

    let credential: AppleAuthentication.AppleAuthenticationCredential;
    try {
      credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
    } catch (err: any) {
      // User dismissed the Apple sheet — not an error, silently bail.
      if (err?.code === 'ERR_REQUEST_CANCELED') return;
      throw err;
    }

    if (!credential.identityToken) throw new Error('Apple Sign In failed: no identity token');

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: rawNonce,
    });
    if (error) throw error;

    // Apple only provides fullName on the very first sign-in — save it then.
    if (credential.fullName) {
      const parts = [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean);
      if (parts.length > 0) {
        await supabase.auth.updateUser({ data: { display_name: parts.join(' ') } });
      }
    }
  }, []);

  const updateUserRole = useCallback(
    async (role: UserRole) => {
      if (!user) throw new Error('No authenticated user');
      const validatedRole = userRoleSchema.parse(role);

      // Update auth user metadata — this is the authoritative source for role.
      const { error: metaError } = await supabase.auth.updateUser({
        data: { role: validatedRole },
      });
      if (metaError) throw metaError;

      // Best-effort: sync to the profiles table row. This may silently affect 0
      // rows (no existing row) or fail due to RLS — both are acceptable since
      // metadata is the source of truth and the DB trigger handles the initial row.
      await supabase.from('profiles').update({ role: validatedRole }).eq('id', user.id);

      // Optimistically patch local state so the nav guard re-evaluates immediately
      // without waiting for the onAuthStateChange → fetchProfile round-trip.
      setProfile((prev) =>
        prev
          ? { ...prev, role: validatedRole }
          : {
              id: user.id,
              display_name: (user.user_metadata?.display_name as string) ?? '',
              role: validatedRole,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
      );
    },
    [user],
  );

  const signOut = useCallback(async () => {
    // Must call supabase.auth.signOut() — not just clear local state — to
    // invalidate the refresh token server-side immediately (Gap 7 mitigation).
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setIsGuest(false);
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
      redirectTo: 'billd-tonight://auth-callback',
    });
  }, []);

  // ── Dev-only bypass ──────────────────────────────────────────────────────────
  // Directly patches local state so the router guard opens the app without any
  // Supabase call or email confirmation. No-op in production builds.
  const signInAsDevRole = useCallback((role: UserRole) => {
    if (!__DEV__) return;
    const validatedRole = userRoleSchema.parse(role);
    const label = validatedRole.charAt(0).toUpperCase() + validatedRole.slice(1);
    setProfile({
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
        signInWithApple,
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
