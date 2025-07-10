'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  BuildingIcon,
  UsersIcon,
  SettingsIcon,
  TrashIcon,
  PlusIcon,
} from 'lucide-react';
import { toast } from '@/components/toast';

interface Organization {
  id: string;
  name: string;
  description?: string;
  role: string;
  memberCount: number;
  createdAt: string;
  ownerId: string;
}

export default function OrganizationsPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/organizations');
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data);
      } else {
        toast({
          type: 'error',
          description: 'Failed to fetch organizations',
        });
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast({
        type: 'error',
        description: 'Failed to fetch organizations',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrganization = async (organizationId: string) => {
    setDeletingId(organizationId);
    try {
      const response = await fetch(`/api/organizations/${organizationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          type: 'success',
          description: 'Organization deleted successfully',
        });
        setOrganizations((prev) => prev.filter((org) => org.id !== organizationId));
      } else {
        const errorText = await response.text();
        toast({
          type: 'error',
          description: errorText || 'Failed to delete organization',
        });
      }
    } catch (error) {
      console.error('Error deleting organization:', error);
      toast({
        type: 'error',
        description: 'Failed to delete organization',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Organizations</h1>
          <p className="text-gray-600 mt-1">
            Manage your organizations and team collaboration
          </p>
        </div>
        <Button onClick={() => router.push('/organizations/new')}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Organization
        </Button>
      </div>

      <div className="space-y-4">
        {organizations.map((org) => (
          <Card key={org.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <BuildingIcon className="h-6 w-6" />
                  <div>
                    <CardTitle className="text-lg">{org.name}</CardTitle>
                    {org.description && (
                      <p className="text-sm text-gray-600 mt-1">{org.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={getRoleBadgeVariant(org.role)}>
                    {org.role.charAt(0).toUpperCase() + org.role.slice(1)}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <UsersIcon className="h-4 w-4" />
                    <span>{org.memberCount} members</span>
                  </div>
                  <div>
                    Created {new Date(org.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/organizations/${org.id}`)}
                  >
                    <SettingsIcon className="h-4 w-4 mr-1" />
                    Manage
                  </Button>
                  {org.role === 'owner' && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={deletingId === org.id}
                        >
                          <TrashIcon className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Organization</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{org.name}"? This action
                            cannot be undone and will remove all associated data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteOrganization(org.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {deletingId === org.id ? 'Deleting...' : 'Delete'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {organizations.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <BuildingIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No organizations yet</h3>
              <p className="text-gray-600 mb-4">
                Create your first organization to start collaborating with your team
              </p>
              <Button onClick={() => router.push('/organizations/new')}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Organization
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
