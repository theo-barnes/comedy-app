---
description: 'Use when changing Expo routes, TypeScript/React Native source, or frontend tests. Covers feature ownership, API boundaries, shared UI, platform behavior, and validation.'
applyTo: 'app/**/*.tsx,src/**/*.ts,src/**/*.tsx,__tests__/**/*.ts,__tests__/**/*.tsx'
---

# Frontend Engineering Rules

- Treat `app/` as route wiring. Put UI behavior, data mapping, and role-specific composition in
  the owning `src/features/<feature>/` module.
- Reuse `src/components`, theme tokens, feature layouts, query-key conventions, and existing
  view-model selectors before creating an abstraction. Extract only stable shared behavior or a
  clear domain concept; otherwise keep code local.
- Keep server state in React Query and validate platform API responses at `src/lib/api/` with Zod.
  Do not bypass the API client or invent an untyped response shape.
- Specify loading, error, empty, offline, and permission-denied behavior when a screen or hook
  fetches data or depends on a device capability. Preserve accessibility and native platform
  behavior, including Liquid Glass fallbacks.
- Read the Expo SDK 56 documentation before adding or changing Expo APIs. Test observable
  component, hook, or screen behavior with the established React Native Testing Library helpers.
- For UI, media, auth, or integration changes, use a simulator/device or available automation to
  exercise the changed journey in addition to unit tests when practical.
