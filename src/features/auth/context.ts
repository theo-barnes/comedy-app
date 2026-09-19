import { createContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';

import type { UserProfile, UserRole } from '@/types';

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isGuest: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (displayName: string, email: string, password: string, role: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  exchangeCodeForSession: (code: string) => Promise<void>;
  updateUserRole: (role: UserRole) => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<void>;
  signInAsDevRole: (role: UserRole) => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
