'use client';

import { Sun, Moon } from 'lucide-react';
import { useMindSparkTheme } from '@/hooks/use-mindSpark-theme';
import { cn } from '@/lib/utils';

interface ThemeToggleSwitchProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  layout?: 'inline' | 'justify-between';
}

export function ThemeToggleSwitch({ 
  className, 
  size = 'md', 
  showLabel = true,
  layout = 'justify-between'
}: ThemeToggleSwitchProps) {
  const { theme, toggleTheme } = useMindSparkTheme();
  const isDark = theme === 'dark';

  const sizeClasses = {
    sm: {
      track: 'h-5 w-9',
      thumb: 'size-4',
      icon: 'size-3',
    },
    md: {
      track: 'h-6 w-11',
      thumb: 'size-5',
      icon: 'h-3.5 w-3.5',
    },
    lg: {
      track: 'h-7 w-12',
      thumb: 'size-6',
      icon: 'size-4',
    },
  };

  const sizes = sizeClasses[size];

  const switchElement = (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggleTheme();
      }}
      className={cn(
        'relative inline-flex items-center rounded-full transition-all duration-300 ease-in-out',
        'focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 dark:focus:ring-offset-slate-800',
        'hover:shadow-lg active:scale-95',
        sizes.track,
        isDark 
          ? 'bg-gradient-to-r from-accent-primary to-accent-secondary shadow-[0_0_20px_rgba(221,0,255,0.6)] hover:shadow-[0_0_30px_rgba(221,0,255,0.8)]' 
          : 'bg-gradient-to-r from-slate-300 to-slate-400 shadow-[0_0_8px_rgba(0,0,0,0.15)] hover:shadow-[0_0_12px_rgba(0,0,0,0.25)]'
      )}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      role="switch"
      aria-checked={isDark}
    >
      {/* Track background overlay for better contrast */}
      <div 
        className={cn(
          'absolute inset-0 rounded-full transition-all duration-300',
          isDark 
            ? 'bg-gradient-to-r from-accent-primary/95 to-accent-secondary/95' 
            : 'bg-gradient-to-r from-slate-300 to-slate-400'
        )}
      />
      
      {/* Thumb */}
      <div
        className={cn(
          'relative flex items-center justify-center rounded-full transition-all duration-300 ease-in-out',
          'shadow-lg z-10',
          isDark 
            ? 'bg-slate-900 shadow-[0_0_15px_rgba(0,255,255,0.5)] border border-cyan-400/30' 
            : 'bg-white shadow-[0_0_8px_rgba(0,0,0,0.1)] border border-slate-200',
          sizes.thumb,
          isDark ? 'translate-x-4' : 'translate-x-0.5'
        )}
      >
        {/* Icon */}
        {isDark ? (
          <Moon 
            className={cn(
              'text-cyan-300 transition-all duration-300 drop-shadow-[0_0_8px_rgba(0,255,255,0.7)]',
              sizes.icon
            )}
            fill="currentColor"
          />
        ) : (
          <Sun 
            className={cn(
              'text-yellow-500 transition-all duration-300 drop-shadow-[0_0_6px_rgba(255,193,7,0.6)]',
              sizes.icon
            )}
          />
        )}
      </div>
    </button>
  );

  if (!showLabel) {
    return (
      <div className={cn('flex items-center', className)}>
        {switchElement}
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-center w-full',
      layout === 'justify-between' ? 'justify-between' : 'gap-3',
      className
    )}>
      <span className="text-sm font-medium text-foreground">
        Theme
      </span>
      {switchElement}
    </div>
  );
}
