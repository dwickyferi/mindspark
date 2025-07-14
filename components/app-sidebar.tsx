'use client';

import type { User } from 'next-auth';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import { PlusIcon, SidebarLeftIcon, SidebarRightIcon } from '@/components/icons';
import { ChatHistoryDropdown } from '@/components/chat-history-dropdown';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
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
import { cn } from '@/lib/utils';

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const { setOpenMobile, state, toggleSidebar } = useSidebar();

  const isCollapsed = state === 'collapsed';

  const handleNewChat = () => {
    setOpenMobile(false);
    router.push('/');
    router.refresh();
  };

  return (
    <Sidebar className="group-data-[side=left]:border-r-0" collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <div className="flex flex-row justify-between items-center mb-4">
            {!isCollapsed && (
              <Link
                href="/"
                onClick={() => {
                  setOpenMobile(false);
                }}
                className="flex flex-row gap-1 items-center group"
              >
                <Image
                  src="/images/mind-spark.png"
                  alt="MindSpark Logo"
                  width={26}
                  height={26}
                  className="rounded-sm transition-transform group-hover:scale-105"
                />
                <span className="text-lg font-semibold pr-2 hover:bg-muted rounded-md cursor-pointer transition-colors">
                  MindSpark
                </span>
              </Link>
            )}
            
            {isCollapsed && (
              <div className="flex justify-center w-full">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href="/" onClick={() => setOpenMobile(false)}>
                      <Image
                        src="/images/mind-spark.png"
                        alt="MindSpark Logo"
                        width={26}
                        height={26}
                        className="rounded-sm cursor-pointer transition-transform hover:scale-105"
                      />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">MindSpark</TooltipContent>
                </Tooltip>
              </div>
            )}
            
            {/* Toggle button replaces + icon when expanded */}
            {!isCollapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    data-testid="sidebar-toggle-button"
                    variant="ghost"
                    size="icon"
                    onClick={toggleSidebar}
                    className="h-8 w-8 transition-all duration-200 hover:bg-sidebar-accent min-h-[44px] min-w-[44px] md:min-h-[32px] md:min-w-[32px]"
                    aria-label="Collapse Sidebar"
                  >
                    <div className="transition-transform duration-200">
                      <SidebarLeftIcon size={16} />
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent align="end">Collapse Sidebar</TooltipContent>
              </Tooltip>
            )}
          </div>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent className="flex-1 overflow-hidden">
        <div className="px-2 py-2">
          
          <ChatHistoryDropdown user={user} isCollapsed={isCollapsed} />
        </div>
        
        {/* New Chat button - moved to content area for better accessibility */}
        <div className="px-2 py-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                onClick={handleNewChat}
                className={cn(
                  'transition-all duration-200 hover:bg-sidebar-accent min-h-[44px] md:min-h-[32px]',
                  isCollapsed 
                    ? 'w-8 h-8 p-0 min-w-[44px] md:min-w-[32px]' 
                    : 'w-full justify-start gap-2 px-2 py-2'
                )}
                aria-label="New Chat"
              >
                <PlusIcon size={16} />
                {!isCollapsed && <span className="text-sm font-medium">New Chat</span>}
              </Button>
            </TooltipTrigger>
            <TooltipContent side={isCollapsed ? "right" : "top"}>
              New Chat
            </TooltipContent>
          </Tooltip>
        </div>
      </SidebarContent>
      
      <SidebarFooter className="border-t border-sidebar-border">
        {!isCollapsed && user && <SidebarUserNav user={user} />}
        
        {/* Toggle button positioned above separator when collapsed */}
        {isCollapsed && (
          <div className="flex justify-center py-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  data-testid="sidebar-toggle-button"
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className="h-8 w-8 transition-all duration-200 hover:bg-sidebar-accent min-h-[44px] min-w-[44px] md:min-h-[32px] md:min-w-[32px]"
                  aria-label="Expand Sidebar"
                >
                  <SidebarRightIcon size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand Sidebar</TooltipContent>
            </Tooltip>
          </div>
        )}
        
        {/* User avatar for collapsed state - positioned below separator */}
        {isCollapsed && user && (
          <div className="flex justify-center py-2 border-t border-sidebar-border">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-full p-0 min-h-[44px] min-w-[44px] md:min-h-[32px] md:min-w-[32px]"
                  aria-label="User menu"
                >
                  <Image
                    src={`https://avatar.vercel.sh/${user.email}`}
                    alt={user.email ?? 'User Avatar'}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{user.name || user.email}</TooltipContent>
            </Tooltip>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
