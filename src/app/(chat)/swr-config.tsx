"use client";
import { useEffect } from "react";
import { SWRConfig } from "swr";

export function SWRConfigProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // This effect runs once when the component mounts
    // It can be used for any global setup or configuration
  }, []);
  return (
    <SWRConfig
      value={{
        focusThrottleInterval: 30000,
        dedupingInterval: 2000,
        errorRetryCount: 1,
      }}
    >
      {children}
    </SWRConfig>
  );
}
