'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { User } from 'next-auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { SidebarHistory } from '@/components/sidebar-history';
import { useSidebar } from '@/components/ui/sidebar';
import { ChevronDownIcon, ClockRewind } from '@/components/icons';

interface ChatHistoryDropdownProps {
  user: User | undefined;
  isCollapsed?: boolean;
}

export function ChatHistoryDropdown({ user, isCollapsed = false }: ChatHistoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isHovering, setIsHovering] = useState(false);
  const { state } = useSidebar();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Handle hover for collapsed state with improved timing
  const handleMouseEnter = () => {
    const currentlyCollapsed = isCollapsed || state === 'collapsed';
    if (!currentlyCollapsed) return;
    
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    const currentlyCollapsed = isCollapsed || state === 'collapsed';
    if (!currentlyCollapsed) return;
    
    // Delay before hiding to allow moving to the card
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovering(false);
    }, 150); // Reduced delay for more responsive feel
  };

  // Handle keyboard navigation and touch devices
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const currentlyCollapsed = isCollapsed || state === 'collapsed';
    if (currentlyCollapsed) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsHovering(true);
      } else if (e.key === 'Escape') {
        setIsHovering(false);
      }
    }
  };

  // Handle click for touch devices (mobile fallback)
  const handleClick = (e: React.MouseEvent) => {
    const currentlyCollapsed = isCollapsed || state === 'collapsed';
    if (currentlyCollapsed) {
      e.preventDefault();
      e.stopPropagation();
      // Toggle hover state on click as fallback
      setIsHovering(!isHovering);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsHovering(false);
        // Clear any pending hover timeout
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setIsHovering(false);
        // Clear any pending hover timeout
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
      }
    };

    if (isOpen || isHovering) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, isHovering]);

  // Close dropdown when sidebar state changes
  useEffect(() => {
    setIsOpen(false);
    setIsHovering(false);
    setSearchQuery('');
  }, [state]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const currentlyCollapsed = isCollapsed || state === 'collapsed';
  
  // TEMPORARY: Force collapsed state for testing - remove this line after testing
  // const currentlyCollapsed = true;

  // In collapsed state, show only the icon with hover dropdown
  if (currentlyCollapsed) {
    return (
      <div 
        className="relative flex items-center justify-center" 
        ref={dropdownRef}
      >
        {/* Trigger Button with direct hover handling */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'size-8 shrink-0 transition-all duration-200 hover:bg-sidebar-accent min-h-[44px] min-w-[44px] md:min-h-[32px] md:min-w-[32px]',
            'hover:scale-105', // Visual feedback
            (isHovering || isOpen) && 'bg-sidebar-accent text-sidebar-accent-foreground scale-105'
          )}
          aria-label="Chat history"
          aria-expanded={isHovering || isOpen}
          aria-controls={isHovering ? "chat-history-card" : undefined}
          onKeyDown={handleKeyDown}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          tabIndex={0}
        >
          <ClockRewind size={16} />
        </Button>
        
        <AnimatePresence>
          {isHovering && (
            <>
              {/* Mobile backdrop */}
              <div className="fixed inset-0 z-40 md:hidden" onClick={() => setIsHovering(false)} />
              
              {/* ShadCN Hoverable Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute left-full ml-2 top-0 z-50"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <Card 
                  className={cn(
                    "w-[280px] min-w-[280px] max-w-[calc(100vw-3rem)] shadow-lg border-border/60",
                    "md:max-w-[400px] lg:max-w-[450px]"
                  )}
                  id="chat-history-card"
                >
                  <CardContent className="p-0">
                    {/* Search Input Section */}
                    <div className="p-3 border-b border-border/50">
                      <Input
                        type="text"
                        placeholder="Search chat history..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full text-sm bg-background/50 border-input/60 focus:ring-2 focus:ring-ring/50 focus:border-ring rounded-lg transition-all duration-200"
                        autoFocus={false}
                        aria-label="Search chat history"
                        tabIndex={isHovering ? 0 : -1}
                      />
                    </div>
                    
                    {/* Scrollable History List */}
                    <div className="max-h-[300px] min-h-[200px] overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-border/40 scrollbar-track-transparent">
                      <SidebarHistory user={user} searchQuery={searchQuery} />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // In expanded state, show the integrated dropdown
  return (
    <div className="relative w-full" ref={dropdownRef}>
      <Button
        variant="ghost"
        onClick={toggleDropdown}
        className={cn(
          'w-full justify-between h-auto py-2 px-2 text-left font-normal',
          isOpen && 'bg-sidebar-accent text-sidebar-accent-foreground'
        )}
        aria-expanded={isOpen}
        aria-label="Toggle chat history"
      >
        <div className="flex items-center gap-2">
          <ClockRewind size={16} />
          <span className="text-sm font-medium">Chat History</span>
        </div>
        <div className={cn('transition-transform duration-200', isOpen && 'rotate-180')}>
          <ChevronDownIcon size={16} />
        </div>
      </Button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden bg-sidebar"
          >
            {/* Search input for expanded state */}
            <div className="p-2">
              <Input
                type="text"
                placeholder="Search chat history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm bg-background/50 border-input/60 focus:ring-2 focus:ring-ring/50 focus:border-ring rounded-lg transition-all duration-200"
                aria-label="Search chat history"
              />
            </div>
            <div className="max-h-80 overflow-y-auto">
              <SidebarHistory user={user} searchQuery={searchQuery} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
