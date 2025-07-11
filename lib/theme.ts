/**
 * MindSpark Theme System
 * Dynamic accent color management for light/dark mode
 */

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  accentPrimary: string;
  accentSecondary: string;
  accentHover: string;
  accentSuccess: string;
  accentAlert: string;
  textSecondary: string;
  bgPrimary: string;
  bgSecondary: string;
}

export const lightTheme: ThemeColors = {
  accentPrimary: 'rgb(170, 0, 255)',      // Electric Purple
  accentSecondary: 'rgb(0, 180, 255)',    // Cyber Blue
  accentHover: 'rgb(255, 0, 170)',        // Bright Magenta
  accentSuccess: 'rgb(0, 255, 180)',      // Neon Green
  accentAlert: 'rgb(255, 165, 0)',        // Orange Alert
  textSecondary: 'rgb(90, 90, 90)',
  bgPrimary: '#ffffff',
  bgSecondary: '#f8f9fa',
};

export const darkTheme: ThemeColors = {
  accentPrimary: 'rgb(221, 0, 255)',      // Neon Violet
  accentSecondary: 'rgb(0, 255, 255)',    // Aqua Blue Glow
  accentHover: 'rgb(255, 51, 153)',       // Deep Pink Neon
  accentSuccess: 'rgb(0, 255, 180)',      // Neon Green
  accentAlert: 'rgb(255, 255, 0)',        // Electric Yellow
  textSecondary: 'rgb(200, 200, 200)',
  bgPrimary: '#121212',
  bgSecondary: '#1e1e1e',
};

export const gradients = {
  light: {
    primary: 'linear-gradient(135deg, rgb(170, 0, 255), rgb(0, 180, 255))',
    hover: 'linear-gradient(135deg, rgb(255, 0, 170), rgb(170, 0, 255))',
    success: 'linear-gradient(135deg, rgb(0, 255, 180), rgb(0, 180, 255))',
    card: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.8))',
  },
  dark: {
    primary: 'linear-gradient(135deg, rgb(221, 0, 255), rgb(0, 255, 255))',
    hover: 'linear-gradient(135deg, rgb(255, 51, 153), rgb(221, 0, 255))',
    success: 'linear-gradient(135deg, rgb(0, 255, 180), rgb(0, 255, 255))',
    card: 'linear-gradient(135deg, rgba(30, 30, 30, 0.9), rgba(18, 18, 18, 0.8))',
  },
};

/**
 * Get theme colors based on current mode
 */
export function getThemeColors(mode: ThemeMode): ThemeColors {
  return mode === 'light' ? lightTheme : darkTheme;
}

/**
 * Get gradient styles based on current mode
 */
export function getGradients(mode: ThemeMode) {
  return gradients[mode];
}

/**
 * Generate CSS custom properties for theme
 */
export function generateThemeCSSVars(mode: ThemeMode): Record<string, string> {
  const colors = getThemeColors(mode);
  const grads = getGradients(mode);
  
  return {
    '--accent-primary': colors.accentPrimary,
    '--accent-secondary': colors.accentSecondary,
    '--accent-hover': colors.accentHover,
    '--accent-success': colors.accentSuccess,
    '--accent-alert': colors.accentAlert,
    '--text-secondary': colors.textSecondary,
    '--bg-primary': colors.bgPrimary,
    '--bg-secondary': colors.bgSecondary,
    '--gradient-primary': grads.primary,
    '--gradient-hover': grads.hover,
    '--gradient-success': grads.success,
    '--gradient-card': grads.card,
  };
}

/**
 * Apply theme to document root
 */
export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  const vars = generateThemeCSSVars(mode);
  
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

/**
 * Detect system theme preference
 */
export function getSystemTheme(): ThemeMode {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

/**
 * Theme utility class names for Tailwind
 */
export const themeClasses = {
  buttons: {
    primary: 'bg-gradient-primary hover:bg-gradient-hover text-white font-semibold py-2 px-4 rounded-lg transform hover:scale-105 transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl',
    secondary: 'bg-accent-secondary hover:bg-accent-hover text-white font-semibold py-2 px-4 rounded-lg transform hover:scale-105 transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl',
    success: 'bg-gradient-success hover:opacity-90 text-white font-semibold py-2 px-4 rounded-lg transform hover:scale-105 transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl',
  },
  text: {
    accent: 'text-accent-primary',
    secondary: 'text-accent-secondary',
    muted: 'text-text-secondary',
  },
  effects: {
    glow: 'shadow-[0_0_20px_rgba(170,0,255,0.3)] dark:shadow-[0_0_20px_rgba(221,0,255,0.4)]',
    glowHover: 'hover:shadow-[0_0_25px_rgba(170,0,255,0.5)] dark:hover:shadow-[0_0_25px_rgba(221,0,255,0.6)]',
  },
  status: {
    online: 'bg-accent-success shadow-[0_0_10px_rgba(0,255,180,0.5)]',
    busy: 'bg-accent-alert shadow-[0_0_10px_rgba(255,255,0,0.5)]',
    offline: 'bg-text-secondary shadow-[0_0_10px_rgba(90,90,90,0.3)] dark:shadow-[0_0_10px_rgba(200,200,200,0.3)]',
  },
};

/**
 * Generate theme-aware shadow styles
 */
export function getThemeShadow(color: 'primary' | 'secondary' | 'success' | 'alert', opacity = 0.3) {
  const colors = {
    primary: { light: '170,0,255', dark: '221,0,255' },
    secondary: { light: '0,180,255', dark: '0,255,255' },
    success: { light: '0,255,180', dark: '0,255,180' },
    alert: { light: '255,165,0', dark: '255,255,0' },
  };
  
  return {
    light: `0 0 20px rgba(${colors[color].light}, ${opacity})`,
    dark: `0 0 20px rgba(${colors[color].dark}, ${opacity})`,
  };
}
