import { Redirect } from 'expo-router';

import { useAuth } from '@/features/auth/useAuth';

// Default screen for the (auth) group.
// Authenticated users with no role are sent to select-role;
// everyone else goes to sign-in.
export default function AuthIndex() {
  const { session, profile } = useAuth();
  if (session && !profile?.role) {
    return <Redirect href="/(auth)/select-role" />;
  }
  return <Redirect href="/(auth)/sign-in" />;
}
