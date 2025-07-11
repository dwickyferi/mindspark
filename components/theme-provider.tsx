'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ThemeProviderProps } from 'next-themes/dist/types';
import { useThemeEffect } from '@/hooks/use-theme-effect';

function ThemeEffectProvider({ children }: { children: React.ReactNode }) {
  useThemeEffect();
  return <>{children}</>;
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      {...props}
    >
      <ThemeEffectProvider>{children}</ThemeEffectProvider>
    </NextThemesProvider>
  );
}
