import { renderHook } from '@testing-library/react-native';

import { useRoleOptions } from '@/features/auth/useRoleOptions';

// react-i18next is mocked globally in jest.setup.ts — t returns the key as-is.

describe('useRoleOptions', () => {
  it('returns exactly 3 role options', () => {
    const { result } = renderHook(() => useRoleOptions());
    expect(result.current).toHaveLength(3);
  });

  it('returns options for fan, comedian and venue roles', () => {
    const { result } = renderHook(() => useRoleOptions());
    const roles = result.current.map((opt) => opt.role);
    expect(roles).toContain('fan');
    expect(roles).toContain('comedian');
    expect(roles).toContain('venue');
  });

  it('each option has a label, description and icon', () => {
    const { result } = renderHook(() => useRoleOptions());
    for (const opt of result.current) {
      expect(typeof opt.label).toBe('string');
      expect(opt.label.length).toBeGreaterThan(0);
      expect(typeof opt.description).toBe('string');
      expect(opt.description.length).toBeGreaterThan(0);
      expect(typeof opt.icon).toBe('string');
      expect(opt.icon.length).toBeGreaterThan(0);
    }
  });
});
