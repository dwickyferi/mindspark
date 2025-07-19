'use client';

import { useMindSparkTheme } from '@/hooks/use-mindSpark-theme';
import { themeClasses } from '@/lib/theme';
import { ThemeToggleSwitch } from './theme-toggle-switch';

export function MindSparkShowcase() {
  const { theme } = useMindSparkTheme();

  return (
    <div className="p-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className={`text-4xl font-bold ${themeClasses.text.accent}`}>
          MindSpark Theme System
        </h1>
        <p className={`text-lg ${themeClasses.text.muted}`}>
          Dynamic accent colors that adapt to light and dark modes
        </p>
      </div>

      {/* Theme Toggle */}
      <div className="flex justify-center">
        <ThemeToggleSwitch size="lg" />
      </div>

      {/* Button Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-4">
          <h3 className={`text-xl font-semibold ${themeClasses.text.accent}`}>
            Primary Buttons
          </h3>
          <button className={themeClasses.buttons.primary}>
            Primary Action
          </button>
          <button className={`${themeClasses.buttons.primary} ${themeClasses.effects.glowHover}`}>
            With Glow Effect
          </button>
        </div>

        <div className="space-y-4">
          <h3 className={`text-xl font-semibold ${themeClasses.text.secondary}`}>
            Secondary Buttons
          </h3>
          <button className={themeClasses.buttons.secondary}>
            Secondary Action
          </button>
          <button className={themeClasses.buttons.success}>
            Success Action
          </button>
        </div>

        <div className="space-y-4">
          <h3 className={`text-xl font-semibold ${themeClasses.text.muted}`}>
            Status Indicators
          </h3>
          <div className="flex gap-2">
            <div className={`size-4 rounded-full ${themeClasses.status.online}`}></div>
            <span className="text-sm">Online</span>
          </div>
          <div className="flex gap-2">
            <div className={`size-4 rounded-full ${themeClasses.status.busy}`}></div>
            <span className="text-sm">Busy</span>
          </div>
          <div className="flex gap-2">
            <div className={`size-4 rounded-full ${themeClasses.status.offline}`}></div>
            <span className="text-sm">Offline</span>
          </div>
        </div>
      </div>

      {/* Card Examples */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="chat-card p-6 rounded-lg">
          <h3 className={`text-lg font-semibold mb-2 ${themeClasses.text.accent}`}>
            Chat Card
          </h3>
          <p className={`${themeClasses.text.muted} mb-4`}>
            This card uses the new MindSpark gradient background and accent colors.
          </p>
          <button className={`${themeClasses.buttons.primary} w-full`}>
            Start Chat
          </button>
        </div>

        <div className={`bg-bg-secondary p-6 rounded-lg border border-accent-primary/20 ${themeClasses.effects.glow}`}>
          <h3 className={`text-lg font-semibold mb-2 ${themeClasses.text.secondary}`}>
            Highlighted Card
          </h3>
          <p className={`${themeClasses.text.muted} mb-4`}>
            This card has a subtle glow effect and uses the theme&apos;s secondary background.
          </p>
          <button className={`${themeClasses.buttons.secondary} w-full`}>
            Learn More
          </button>
        </div>
      </div>

      {/* Color Palette */}
      <div className="space-y-4">
        <h3 className={`text-xl font-semibold ${themeClasses.text.accent}`}>
          Color Palette
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center space-y-2">
            <div className="size-16 mx-auto rounded-lg bg-accent-primary shadow-lg"></div>
            <p className="text-sm font-medium">Primary</p>
          </div>
          <div className="text-center space-y-2">
            <div className="size-16 mx-auto rounded-lg bg-accent-secondary shadow-lg"></div>
            <p className="text-sm font-medium">Secondary</p>
          </div>
          <div className="text-center space-y-2">
            <div className="size-16 mx-auto rounded-lg bg-accent-success shadow-lg"></div>
            <p className="text-sm font-medium">Success</p>
          </div>
          <div className="text-center space-y-2">
            <div className="size-16 mx-auto rounded-lg bg-accent-alert shadow-lg"></div>
            <p className="text-sm font-medium">Alert</p>
          </div>
        </div>
      </div>
    </div>
  );
}
