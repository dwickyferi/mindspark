'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BuildingIcon, CheckIcon, XIcon } from 'lucide-react';
import { toast } from '@/components/toast';

function InvitationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) {
      toast({
        type: 'error',
        description: 'Invalid invitation link',
      });
      router.push('/');
    }
  }, [token, router]);

  const handleAcceptInvitation = async () => {
    if (!token) return;

    setAccepting(true);
    try {
      const response = await fetch('/api/organizations/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        setAccepted(true);
        toast({
          type: 'success',
          description: 'Invitation accepted successfully',
        });
        setTimeout(() => {
          router.push('/organizations');
        }, 2000);
      } else {
        const errorText = await response.text();
        toast({
          type: 'error',
          description: errorText || 'Failed to accept invitation',
        });
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast({
        type: 'error',
        description: 'Failed to accept invitation',
      });
    } finally {
      setAccepting(false);
    }
  };

  const handleDeclineInvitation = () => {
    toast({
      type: 'success',
      description: 'Invitation declined',
    });
    router.push('/');
  };

  if (!token) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-blue-100 dark:bg-blue-900">
            <BuildingIcon className="size-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl">Organization Invitation</CardTitle>
          <p className="text-gray-600 dark:text-gray-400">
            You&apos;ve been invited to join an organization
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {accepted ? (
            <div className="text-center">
              <div className="mx-auto mb-4 p-3 rounded-full bg-green-100 dark:bg-green-900">
                <CheckIcon className="size-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-green-600 dark:text-green-400 font-medium">
                Invitation accepted successfully!
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Redirecting you to your organizations...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-center text-gray-600 dark:text-gray-400">
                Do you want to accept this invitation?
              </p>
              <div className="flex space-x-2">
                <Button
                  onClick={handleAcceptInvitation}
                  disabled={accepting}
                  className="flex-1"
                >
                  {accepting ? 'Accepting...' : 'Accept'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDeclineInvitation}
                  disabled={accepting}
                  className="flex-1"
                >
                  Decline
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function InvitationPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InvitationPageContent />
    </Suspense>
  );
}