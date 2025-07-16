'use client';

import { useEffect, useRef } from 'react';

interface UsePollingOptions {
  enabled?: boolean;
  interval?: number;
  onError?: (error: Error) => void;
}

export function usePolling(
  callback: () => Promise<void> | void,
  options: UsePollingOptions = {}
) {
  const {
    enabled = true,
    interval = 30000, // 30 seconds default
    onError,
  } = options;

  const callbackRef = useRef(callback);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const executeCallback = async () => {
      try {
        await callbackRef.current();
      } catch (error) {
        if (onError) {
          onError(error instanceof Error ? error : new Error('Unknown error'));
        }
      }
    };

    // Execute immediately
    executeCallback();

    // Then set up polling
    intervalRef.current = setInterval(executeCallback, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, interval, onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
}

// Hook for manual refresh trigger
export function useRefresh() {
  const triggerRefresh = () => {
    window.dispatchEvent(new CustomEvent('organization-refresh'));
  };

  return triggerRefresh;
}

// Hook for listening to refresh events
export function useRefreshListener(callback: () => void) {
  useEffect(() => {
    const handleRefresh = () => {
      callback();
    };

    window.addEventListener('organization-refresh', handleRefresh);
    return () => {
      window.removeEventListener('organization-refresh', handleRefresh);
    };
  }, [callback]);
}
