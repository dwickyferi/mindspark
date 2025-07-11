'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { applyTheme } from '@/lib/theme';

/**
 * Hook to apply MindSpark theme effects when the theme changes
 */
export function useThemeEffect() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (resolvedTheme && (resolvedTheme === 'light' || resolvedTheme === 'dark')) {
      applyTheme(resolvedTheme);
    }
  }, [resolvedTheme]);
}
