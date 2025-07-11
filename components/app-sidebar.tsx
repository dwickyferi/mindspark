'use client';

import type { User } from 'next-auth';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';

import { PlusIcon } from '@/components/icons';
import { SidebarHistory } from '@/components/sidebar-history';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
import { OrganizationSelector } from '@/components/organization-selector';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      // Fetch active organization from server
      // This would typically be done with a server component or API call
      // For now, we'll manage it on the client side
    }
  }, [user?.id]);

  return (
    <Sidebar className="group-data-[side=left]:border-r-0">
      <SidebarHeader>
        <SidebarMenu>
          <div className="flex flex-row justify-between items-center mb-4">
            <Link
              href="/"
              onClick={() => {
                setOpenMobile(false);
              }}
              className="flex flex-row gap-1 items-center"
            >
              <Image
                src="/images/mind-spark.png"
                alt="MindSpark Logo"
                width={26}
                height={26}
                className="rounded-sm"
              />
              <span className="text-lg font-semibold pr-2 hover:bg-muted rounded-md cursor-pointer">
                MindSpark
              </span>
            </Link>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  type="button"
                  className="p-2 h-fit"
                  onClick={() => {
                    setOpenMobile(false);
                    router.push('/');
                    router.refresh();
                  }}
                >
                  <PlusIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent align="end">New Chat</TooltipContent>
            </Tooltip>
          </div>
          {user && (
            <div className="px-2 mb-4">
              <OrganizationSelector
                activeOrganizationId={activeOrganizationId}
                onOrganizationChange={setActiveOrganizationId}
              />
            </div>
          )}
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarHistory user={user} />
      </SidebarContent>
      <SidebarFooter>{user && <SidebarUserNav user={user} />}</SidebarFooter>
    </Sidebar>
  );
}
