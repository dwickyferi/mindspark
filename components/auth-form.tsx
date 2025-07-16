import Form from 'next/form';
import { Eye, EyeOff, User, Mail, Lock } from 'lucide-react';
import { useState } from 'react';

import { Input } from './ui/input';
import { Label } from './ui/label';
import { cn } from '@/lib/utils';

export function AuthForm({
  action,
  children,
  defaultEmail = '',
  defaultName = '',
  showNameField = false,
}: {
  action: NonNullable<
    string | ((formData: FormData) => void | Promise<void>) | undefined
  >;
  children: React.ReactNode;
  defaultEmail?: string;
  defaultName?: string;
  showNameField?: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Form action={action} className="space-y-6">
      {showNameField && (
        <div className="space-y-2">
          <Label
            htmlFor="name"
            className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2"
          >
            <User className="size-4 text-slate-500 dark:text-slate-400" />
            Full Name
          </Label>
          <div className="relative">
            <Input
              id="name"
              name="name"
              className={cn(
                "h-12 bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-600 backdrop-blur-sm",
                "focus:border-accent-primary/70 focus:ring-accent-primary/30 dark:focus:border-accent-primary/50 dark:focus:ring-accent-primary/20",
                "transition-all duration-300 pl-4 pr-4",
                "placeholder:text-slate-400 dark:placeholder:text-slate-500",
                "text-slate-900 dark:text-slate-100"
              )}
              type="text"
              placeholder="Enter your full name"
              autoComplete="name"
              required
              autoFocus
              defaultValue={defaultName}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label
          htmlFor="email"
          className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2"
        >
          <Mail className="size-4 text-slate-500 dark:text-slate-400" />
          Email Address
        </Label>
        <div className="relative">
          <Input
            id="email"
            name="email"
            className={cn(
              "h-12 bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-600 backdrop-blur-sm",
              "focus:border-accent-primary/70 focus:ring-accent-primary/30 dark:focus:border-accent-primary/50 dark:focus:ring-accent-primary/20",
              "transition-all duration-300 pl-4 pr-4",
              "placeholder:text-slate-400 dark:placeholder:text-slate-500",
              "text-slate-900 dark:text-slate-100"
            )}
            type="email"
            placeholder="Enter your email address"
            autoComplete="email"
            required
            autoFocus={!showNameField}
            defaultValue={defaultEmail}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="password"
          className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2"
        >
          <Lock className="size-4 text-slate-500 dark:text-slate-400" />
          Password
        </Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            className={cn(
              "h-12 bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-600 backdrop-blur-sm",
              "focus:border-accent-primary/70 focus:ring-accent-primary/30 dark:focus:border-accent-primary/50 dark:focus:ring-accent-primary/20",
              "transition-all duration-300 pl-4 pr-12",
              "placeholder:text-slate-400 dark:placeholder:text-slate-500",
              "text-slate-900 dark:text-slate-100"
            )}
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
      </div>

      <div className="pt-2">
        {children}
      </div>
    </Form>
  );
}
