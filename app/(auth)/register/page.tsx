'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

import { AuthForm } from '@/components/auth-form';
import { SubmitButton } from '@/components/submit-button';
import { ThemeToggleSwitch } from '@/components/theme-toggle-switch';

import { register, type RegisterActionState } from '../actions';
import { toast } from '@/components/toast';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<RegisterActionState, FormData>(
    register,
    {
      status: 'idle',
    },
  );

  const { update: updateSession } = useSession();

  useEffect(() => {
    if (state.status === 'user_exists') {
      toast({ type: 'error', description: 'Account already exists!' });
    } else if (state.status === 'failed') {
      toast({ type: 'error', description: 'Failed to create account!' });
    } else if (state.status === 'invalid_data') {
      if (state.errors) {
        const errorMessages = Object.entries(state.errors)
          .map(([field, messages]) => `${field}: ${messages?.join(', ')}`)
          .join('; ');
        toast({
          type: 'error',
          description: `Validation errors: ${errorMessages}`,
        });
      } else {
        toast({
          type: 'error',
          description: 'Failed validating your submission!',
        });
      }
    } else if (state.status === 'success') {
      toast({ type: 'success', description: 'Account created successfully!' });

      setIsSuccessful(true);
      updateSession();
      router.refresh();
    }
  }, [state, router, updateSession]);

  const handleSubmit = (formData: FormData) => {
    setName(formData.get('name') as string);
    setEmail(formData.get('email') as string);
    formAction(formData);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]" />
      <div className="absolute top-4 right-4">
        <ThemeToggleSwitch showLabel={false} size="sm" />
      </div>
      
      {/* Floating Elements */}
      <div className="absolute top-1/4 left-1/4 size-72 bg-accent-primary/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 size-96 bg-accent-secondary/5 rounded-full blur-3xl animate-pulse delay-1000" />
      
      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className={cn(
          "backdrop-blur-xl bg-white/70 dark:bg-slate-900/70",
          "border border-white/20 dark:border-slate-700/50",
          "rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-slate-950/50",
          "p-8 space-y-8"
        )}>
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-gradient-to-r from-accent-primary to-accent-secondary shadow-lg ring-1 ring-white/20">
              <Sparkles className="size-8 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] brightness-110" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                Create Account
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Join MindSpark today and unlock the power of AI-driven conversations
              </p>
            </div>
          </div>

          {/* Form */}
          <AuthForm action={handleSubmit} defaultEmail={email} defaultName={name} showNameField={true}>
            <SubmitButton isSuccessful={isSuccessful} >
              Create Account
            </SubmitButton>
          </AuthForm>

          {/* Footer */}
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-300 dark:border-slate-600" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-slate-900 px-2 text-slate-500 dark:text-slate-400">
                  Or
                </span>
              </div>
            </div>
            
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Already have an account?{' '}
              <Link
                href="/login"
                className={cn(
                  "inline-flex items-center gap-1 font-semibold",
                  "bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text ",
                  "hover:from-accent-primary/80 hover:to-accent-secondary/80",
                  "transition-all duration-200"
                )}
              >
                Sign in
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
