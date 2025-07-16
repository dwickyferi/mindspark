'use client';

import { useFormStatus } from 'react-dom';
import { CheckCircle2 } from 'lucide-react';

import { LoaderIcon } from '@/components/icons';

import { Button } from './ui/button';
import { cn } from '@/lib/utils';

export function SubmitButton({
  children,
  isSuccessful,
}: {
  children: React.ReactNode;
  isSuccessful: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type={pending ? 'button' : 'submit'}
      aria-disabled={pending || isSuccessful}
      disabled={pending || isSuccessful}
      className={cn(
        "relative h-12 w-full overflow-hidden",
        "bg-gradient-to-r from-accent-primary to-accent-secondary",
        "hover:from-accent-primary/90 hover:to-accent-secondary/90",
        "text-white dark:text-black font-semibold text-base",
        "shadow-lg hover:shadow-xl",
        "transition-all duration-300 ease-in-out",
        "hover:scale-[1.02] active:scale-[0.98]",
        "border-0 ring-1 ring-white/20",
        "before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/10 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
        isSuccessful && "bg-gradient-to-r from-green-500 to-green-600 ring-green-400/20"
      )}
    >
      <span className={cn(
        "relative z-10 transition-opacity duration-200",
        (pending || isSuccessful) && "opacity-0"
      )}>
        {children}
      </span>

      {pending && (
        <span className="absolute inset-0 flex items-center justify-center z-20">
          <div className="animate-spin text-white drop-shadow-lg">
            <LoaderIcon size={20} />
          </div>
        </span>
      )}

      {isSuccessful && (
        <span className="absolute inset-0 flex items-center justify-center z-20">
          <CheckCircle2 className="size-5 text-white drop-shadow-lg" />
        </span>
      )}

      <output aria-live="polite" className="sr-only">
        {pending || isSuccessful ? 'Loading' : 'Submit form'}
      </output>
    </Button>
  );
}
