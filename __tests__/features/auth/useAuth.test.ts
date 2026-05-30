// Prevent the transitive import chain (useAuth → AuthProvider → supabase → env)
// from throwing a ZodError about missing environment variables.
jest.mock('@/features/auth/AuthProvider', () => ({
  AuthContext: require('react').createContext(null),
}));

import { renderHook } from '@testing-library/react-native';

import { useAuth } from '@/features/auth/useAuth';

describe('useAuth', () => {
  it('throws when used outside <AuthProvider>', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an <AuthProvider />',
    );
    consoleError.mockRestore();
  });
});
