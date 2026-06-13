import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

/**
 * Compile-time-checked Ionicons glyph name.
 * Use this instead of `string` for any prop that feeds `<Ionicons name>` —
 * typos become type errors rather than blank glyphs at runtime.
 */
export type IoniconName = ComponentProps<typeof Ionicons>['name'];
