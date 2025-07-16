'use client';

import { ThemeToggleSwitch } from '@/components/theme-toggle-switch';
import { useMindSparkTheme } from '@/hooks/use-mindSpark-theme';
import { themeClasses } from '@/lib/theme';

export default function ThemeTestPage() {
  const { theme, isDark } = useMindSparkTheme();

  return (
    <div className="min-h-screen p-8 space-y-8 bg-background text-foreground">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">
          Theme Toggle Test Page
        </h1>
        
        {/* Theme Information */}
        <div className="bg-card p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-2xl font-semibold mb-4">Current Theme</h2>
          <p className="text-lg">
            Active Theme: <span className="font-mono text-accent-primary">{theme}</span>
          </p>
          <p className="text-lg">
            Is Dark: <span className="font-mono text-accent-secondary">{isDark ? 'Yes' : 'No'}</span>
          </p>
        </div>

        {/* Theme Toggle Variations */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Theme Toggle Variations</h2>
          
          {/* Standard toggle with justify-between */}
          <div className="bg-card p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Standard Toggle (justify-between)</h3>
            <ThemeToggleSwitch layout="justify-between" />
          </div>

          {/* Small toggle */}
          <div className="bg-card p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Small Toggle</h3>
            <ThemeToggleSwitch size="sm" layout="justify-between" />
          </div>

          {/* Large toggle */}
          <div className="bg-card p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Large Toggle</h3>
            <ThemeToggleSwitch size="lg" layout="justify-between" />
          </div>

          {/* Inline toggle */}
          <div className="bg-card p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Inline Toggle</h3>
            <ThemeToggleSwitch layout="inline" />
          </div>

          {/* Toggle without label */}
          <div className="bg-card p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Toggle Without Label</h3>
            <ThemeToggleSwitch showLabel={false} />
          </div>
        </div>

        {/* Theme Colors Demo */}
        <div className="bg-card p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-4">Theme Colors Demo</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className={themeClasses.buttons.primary}>
              Primary Button
            </button>
            <button className={themeClasses.buttons.secondary}>
              Secondary Button
            </button>
            <button className={themeClasses.buttons.success}>
              Success Button
            </button>
          </div>
          
          <div className="mt-6 space-y-2">
            <p className={themeClasses.text.accent}>Accent Primary Text</p>
            <p className={themeClasses.text.secondary}>Accent Secondary Text</p>
            <p className={themeClasses.text.muted}>Muted Text</p>
          </div>
        </div>
      </div>
    </div>
  );
}
