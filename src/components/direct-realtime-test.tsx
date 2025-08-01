import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useDirectRealtime,
  isDirectRealtimeConfigured,
} from "@/hooks/use-direct-realtime";
import { checkRealtimeHealth } from "@/lib/realtime-config";

interface DirectRealtimeTestProps {
  userId: string;
}

export function DirectRealtimeTest({ userId }: DirectRealtimeTestProps) {
  const [healthCheck, setHealthCheck] = useState<{
    connected: boolean;
    channels: number;
    error?: string;
  } | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const realtimeState = useDirectRealtime({
    userId,
    enabled: true,
  });

  const handleHealthCheck = async () => {
    setIsCheckingHealth(true);
    try {
      const result = await checkRealtimeHealth();
      setHealthCheck(result);
    } catch (error) {
      setHealthCheck({
        connected: false,
        channels: 0,
        error: error instanceof Error ? error.message : "Health check failed",
      });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "SUBSCRIBED":
        return "bg-green-500";
      case "CHANNEL_ERROR":
        return "bg-red-500";
      case "TIMED_OUT":
        return "bg-orange-500";
      case "CLOSED":
        return "bg-gray-500";
      default:
        return "bg-yellow-500";
    }
  };

  const getConnectionStatusColor = (
    isConnected: boolean,
    isConnecting: boolean,
  ) => {
    if (isConnecting) return "bg-yellow-500";
    return isConnected ? "bg-green-500" : "bg-red-500";
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🚀 Direct Realtime Connection Test
          <Badge
            className={`${getConnectionStatusColor(realtimeState.isConnected, realtimeState.isConnecting)} text-white`}
          >
            {realtimeState.isConnecting
              ? "Connecting..."
              : realtimeState.isConnected
                ? "Connected"
                : "Disconnected"}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Configuration Status */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Configuration Status</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Direct Realtime Configured:</span>
              <Badge
                className={
                  isDirectRealtimeConfigured() ? "bg-green-500" : "bg-red-500"
                }
              >
                {isDirectRealtimeConfigured() ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>User ID:</span>
              <span className="font-mono">{userId || "Not set"}</span>
            </div>
            <div className="flex justify-between">
              <span>Enabled:</span>
              <Badge
                className={
                  realtimeState.isEnabled ? "bg-green-500" : "bg-red-500"
                }
              >
                {realtimeState.isEnabled ? "Yes" : "No"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Connection State */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Connection State</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Connection Status:</span>
              <Badge
                className={getConnectionStatusColor(
                  realtimeState.isConnected,
                  realtimeState.isConnecting,
                )}
              >
                {realtimeState.isConnecting
                  ? "Connecting"
                  : realtimeState.isConnected
                    ? "Connected"
                    : "Disconnected"}
              </Badge>
            </div>

            {realtimeState.subscriptionStatus && (
              <div className="flex justify-between">
                <span>Subscription Status:</span>
                <Badge
                  className={getStatusColor(realtimeState.subscriptionStatus)}
                >
                  {realtimeState.subscriptionStatus}
                </Badge>
              </div>
            )}

            {realtimeState.channelState && (
              <div className="flex justify-between">
                <span>Channel State:</span>
                <span className="font-mono">{realtimeState.channelState}</span>
              </div>
            )}

            {realtimeState.error && (
              <div className="flex flex-col gap-1">
                <span className="text-red-600 font-medium">Error:</span>
                <span className="text-red-600 text-xs font-mono bg-red-50 p-2 rounded">
                  {realtimeState.error}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Debug Information */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Debug Information</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Client State:</span>
              <span className="font-mono">
                {realtimeState.debug.clientState || "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Channel State:</span>
              <span className="font-mono">
                {realtimeState.debug.channelState || "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Channels Count:</span>
              <span className="font-mono">
                {realtimeState.debug.channelsCount}
              </span>
            </div>
          </div>
        </div>

        {/* Environment Variables */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Environment Configuration</h3>
          <div className="space-y-1 text-xs">
            <div>
              <strong>SUPABASE_URL:</strong>{" "}
              {process.env.NEXT_PUBLIC_SUPABASE_URL || "not set"}
            </div>
            <div>
              <strong>SUPABASE_ANON_KEY:</strong>{" "}
              {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
                ? "configured"
                : "not set"}
            </div>
            <div>
              <strong>REALTIME_URL:</strong>{" "}
              {process.env.NEXT_PUBLIC_REALTIME_URL || "using default"}
            </div>
          </div>
        </div>

        {/* Health Check */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Health Check</h3>
            <Button
              onClick={handleHealthCheck}
              disabled={isCheckingHealth}
              size="sm"
            >
              {isCheckingHealth ? "Checking..." : "Run Health Check"}
            </Button>
          </div>

          {healthCheck && (
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Health Status:</span>
                <Badge
                  className={
                    healthCheck.connected ? "bg-green-500" : "bg-red-500"
                  }
                >
                  {healthCheck.connected ? "Healthy" : "Unhealthy"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Channels:</span>
                <span>{healthCheck.channels}</span>
              </div>
              {healthCheck.error && (
                <div className="flex flex-col gap-1">
                  <span className="text-red-600 font-medium">
                    Health Error:
                  </span>
                  <span className="text-red-600 text-xs font-mono bg-red-50 p-2 rounded">
                    {healthCheck.error}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={realtimeState.reconnect}
            disabled={!realtimeState.isEnabled}
            variant="outline"
          >
            🔄 Reconnect
          </Button>
        </div>

        {/* Instructions */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-2 text-blue-800">Instructions</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p>
              1. This component uses the direct @supabase/realtime-js library
            </p>
            <p>
              2. Check that your Supabase is running on the correct port
              (usually 54321)
            </p>
            <p>
              3. The connection should show Connected and subscription should
              show SUBSCRIBED
            </p>
            <p>4. Test by creating/updating notifications in another tab</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
