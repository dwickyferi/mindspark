'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PlusIcon, UsersIcon, BuildingIcon } from 'lucide-react';
import { toast } from '@/components/toast';

interface Organization {
  id: string;
  name: string;
  description?: string;
  role: string;
  memberCount: number;
}

interface OrganizationSelectorProps {
  activeOrganizationId?: string | null;
  onOrganizationChange?: (organizationId: string | null) => void;
}

export function OrganizationSelector({
  activeOrganizationId,
  onOrganizationChange,
}: OrganizationSelectorProps) {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/organizations');
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data);
      } else if (response.status === 500) {
        // Likely the organization tables don't exist yet
        console.warn('Organization features not available yet');
        setOrganizations([]);
      } else {
        console.error('Failed to fetch organizations');
        setOrganizations([]);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOrganizationChange = async (organizationId: string) => {
    setSwitching(true);
    try {
      const response = await fetch('/api/organizations/switch', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: organizationId === 'personal' ? null : organizationId,
        }),
      });

      if (response.ok) {
        onOrganizationChange?.(organizationId === 'personal' ? null : organizationId);
        toast({
          type: 'success',
          description: 'Organization switched successfully',
        });
        router.refresh();
      } else {
        toast({
          type: 'error',
          description: 'Failed to switch organization',
        });
      }
    } catch (error) {
      console.error('Error switching organization:', error);
      toast({
        type: 'error',
        description: 'Failed to switch organization',
      });
    } finally {
      setSwitching(false);
    }
  };

  const handleCreateOrganization = () => {
    router.push('/organizations/new');
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="h-8 w-40 bg-gray-200 animate-pulse rounded"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Select
        value={activeOrganizationId || 'personal'}
        onValueChange={handleOrganizationChange}
        disabled={switching}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select organization">
            <div className="flex items-center space-x-2">
              {activeOrganizationId ? (
                <>
                  <BuildingIcon className="h-4 w-4" />
                  <span>
                    {organizations.find((org) => org.id === activeOrganizationId)?.name ||
                      'Unknown Organization'}
                  </span>
                </>
              ) : (
                <>
                  <UsersIcon className="h-4 w-4" />
                  <span>Personal</span>
                </>
              )}
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="personal">
            <div className="flex items-center space-x-2">
              <UsersIcon className="h-4 w-4" />
              <span>Personal</span>
            </div>
          </SelectItem>
          {organizations.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-2">
                  <BuildingIcon className="h-4 w-4" />
                  <span>{org.name}</span>
                </div>
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <UsersIcon className="h-3 w-3" />
                  <span>{org.memberCount}</span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="sm"
        onClick={handleCreateOrganization}
        className="px-2"
      >
        <PlusIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
