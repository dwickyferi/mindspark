'use client';

import { useState, useEffect, useCallback } from 'react';
import { Building2, Plus, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/toast';
import { LoaderIcon } from '@/components/icons';
import { usePolling, useRefreshListener } from '@/hooks/use-polling';

interface Organization {
  id: string;
  name: string;
  memberCount: number;
  isActive: boolean;
}

interface OrganizationSelectorProps {
  onOrganizationChange?: (organizationId: string) => void;
}

export function OrganizationSelector({ onOrganizationChange }: OrganizationSelectorProps) {
  const [open, setOpen] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const router = useRouter();

  const fetchOrganizations = useCallback(async () => {
    try {
      const response = await fetch('/api/organizations');
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data);
        
        // Find the active organization
        const activeOrg = data.find((org: Organization) => org.isActive);
        if (activeOrg) {
          setSelectedOrg(activeOrg);
        }
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  }, []);

  // Initial fetch and polling
  usePolling(fetchOrganizations, {
    enabled: true,
    interval: 30000, // 30 seconds
  });

  // Listen for manual refresh triggers
  useRefreshListener(fetchOrganizations);

  const handleOrganizationSwitch = async (organizationId: string) => {
    setIsSwitching(true);
    try {
      const response = await fetch('/api/organizations/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ organizationId }),
      });

      if (response.ok) {
        const newActiveOrg = organizations.find(org => org.id === organizationId);
        if (newActiveOrg) {
          setSelectedOrg(newActiveOrg);
          onOrganizationChange?.(organizationId);
          
          // Trigger refresh for other components
          window.dispatchEvent(new CustomEvent('organization-refresh'));
          
          toast({
            type: 'success',
            description: `Switched to ${newActiveOrg.name}`,
          });
        }
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
      setIsSwitching(false);
      setOpen(false);
    }
  };

  const handleCreateOrganization = () => {
    setOpen(false);
    router.push('/organizations/new');
  };

  const handleManageOrganizations = () => {
    setOpen(false);
    router.push('/organizations');
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between"
          disabled={isSwitching}
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="truncate">
              {selectedOrg ? selectedOrg.name : 'Select organization...'}
            </span>
          </div>
          {isSwitching && (
            <LoaderIcon size={16} />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[300px]">
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => handleOrganizationSwitch(org.id)}
            className={cn(
              'flex items-center justify-between',
              selectedOrg?.id === org.id && 'bg-accent'
            )}
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span>{org.name}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{org.memberCount}</span>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCreateOrganization}>
          <Plus className="mr-2 h-4 w-4" />
          Create organization
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleManageOrganizations}>
          <Building2 className="mr-2 h-4 w-4" />
          Manage organizations
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
