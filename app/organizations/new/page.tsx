'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/toast';

export default function NewOrganizationPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        type: 'error',
        description: 'Organization name is required',
      });
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });

      if (response.ok) {
        toast({
          type: 'success',
          description: 'Organization created successfully',
        });
        router.push('/organizations');
      } else {
        const errorText = await response.text();
        toast({
          type: 'error',
          description: errorText || 'Failed to create organization',
        });
      }
    } catch (error) {
      console.error('Error creating organization:', error);
      toast({
        type: 'error',
        description: 'Failed to create organization',
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Create Organization</h1>
            <p className="text-gray-600 mt-1">
              Create a new organization to collaborate with your team
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Organization Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter organization name"
                    disabled={creating}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of your organization"
                    disabled={creating}
                  />
                </div>

                <div className="flex space-x-2 pt-4">
                  <Button type="submit" disabled={creating || !name.trim()}>
                    {creating ? 'Creating...' : 'Create Organization'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
