/**
 * Real-time Notification Debug Component
 * This component will help us debug the exact real-time behavior
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "ui/card";
import { Badge } from "ui/badge";
import { useNotifications } from "@/hooks/use-notifications";
import { useNotificationRealtime } from "@/hooks/use-notification-realtime";
import { isSupabaseRealtimeAvailable } from "@/lib/supabase";
import { authClient } from "auth/client";

export function RealtimeDebugger() {
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [isRealtimeEnabled, setIsRealtimeEnabled] = useState(true);

  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  const notifications = useNotifications();
  const supabaseAvailable = isSupabaseRealtimeAvailable();

  // Enable/disable realtime for testing
  useNotificationRealtime({
    userId,
    enabled: isRealtimeEnabled && supabaseAvailable,
  });

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLog((prev) => [`${timestamp}: ${message}`, ...prev.slice(0, 19)]);
  };

  // Monitor notification changes
  useEffect(() => {
    addLog(
      `Notifications: ${notifications.notifications.length} total, ${notifications.unreadCount} unread`,
    );
  }, [notifications.notifications.length, notifications.unreadCount]);

  // Monitor realtime status
  useEffect(() => {
    addLog(
      `Realtime: ${isRealtimeEnabled ? "enabled" : "disabled"}, Supabase: ${supabaseAvailable ? "available" : "unavailable"}`,
    );
  }, [isRealtimeEnabled, supabaseAvailable]);

  const testLocalNotification = () => {
    const testNotification = {
      id: `local-test-${Date.now()}`,
      userId: userId || "test-user",
      type: "info" as const,
      message: `Local Test Notification - ${new Date().toLocaleTimeString()}`,
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    addLog("Adding local test notification");
    notifications.addNotification(testNotification);
  };

  const testDatabaseNotification = async () => {
    if (!userId || !supabaseAvailable) {
      addLog("❌ Cannot test database: No user or Supabase unavailable");
      return;
    }

    try {
      addLog("🗄️ Inserting notification into database...");

      const { supabase } = await import("@/lib/supabase");
      if (!supabase) {
        addLog("❌ Supabase client not available");
        return;
      }

      const newNotification = {
        id: `db-test-${Date.now()}`,
        user_id: userId,
        type: "info",
        message: `Database Test - ${new Date().toLocaleTimeString()}. This should trigger real-time update.`,
        payload: { test: true, timestamp: Date.now() },
        action_status: null,
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("notification")
        .insert([newNotification])
        .select();

      if (error) {
        addLog(`❌ Database insert failed: ${error.message}`);
      } else {
        addLog(`✅ Database insert successful: ${data?.[0]?.id}`);
        addLog("🔄 Waiting for real-time update...");

        // Check if notification appears within 5 seconds
        const startTime = Date.now();
        const checkInterval = setInterval(() => {
          const found = notifications.notifications.find(
            (n) => n.id === newNotification.id,
          );
          if (found) {
            const elapsed = Date.now() - startTime;
            addLog(`✅ Real-time update received in ${elapsed}ms`);
            clearInterval(checkInterval);
          } else if (Date.now() - startTime > 5000) {
            addLog("⏰ No real-time update after 5 seconds - check logs");
            clearInterval(checkInterval);
          }
        }, 100);
      }
    } catch (error) {
      addLog(`❌ Error: ${error}`);
    }
  };

  const clearNotifications = () => {
    // This would clear notifications locally for testing
    addLog("🧹 Clearing debug log");
    setDebugLog([]);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto m-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Real-time Notification Debugger
          <div className="flex items-center gap-2">
            <Badge variant={supabaseAvailable ? "default" : "secondary"}>
              {supabaseAvailable ? "Real-time" : "Polling"}
            </Badge>
            <Badge variant="outline">
              {notifications.notifications.length} total
            </Badge>
            <Badge
              variant={
                notifications.unreadCount > 0 ? "destructive" : "secondary"
              }
            >
              {notifications.unreadCount} unread
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex gap-3 flex-wrap">
          <Button onClick={testLocalNotification} variant="outline">
            Add Local Notification
          </Button>
          <Button
            onClick={testDatabaseNotification}
            variant="outline"
            disabled={!supabaseAvailable || !userId}
          >
            Add Database Notification
          </Button>
          <Button
            onClick={() => setIsRealtimeEnabled(!isRealtimeEnabled)}
            variant={isRealtimeEnabled ? "default" : "secondary"}
          >
            {isRealtimeEnabled ? "Disable" : "Enable"} Realtime
          </Button>
          <Button onClick={clearNotifications} variant="ghost" size="sm">
            Clear Log
          </Button>
        </div>

        {/* Debug Log */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Debug Log</h3>
          <div className="bg-black text-green-400 font-mono text-xs p-4 rounded-lg h-64 overflow-y-auto">
            {debugLog.length === 0 ? (
              <div className="text-gray-500">Debug log will appear here...</div>
            ) : (
              debugLog.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Current State */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>User ID:</strong> {userId || "Not logged in"}
          </div>
          <div>
            <strong>Supabase Available:</strong>{" "}
            {supabaseAvailable ? "Yes" : "No"}
          </div>
          <div>
            <strong>Realtime Enabled:</strong>{" "}
            {isRealtimeEnabled ? "Yes" : "No"}
          </div>
          <div>
            <strong>Loading:</strong> {notifications.loading ? "Yes" : "No"}
          </div>
        </div>

        {/* Instructions */}
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>How to test:</strong>
          </p>
          <ol className="list-decimal list-inside space-y-1 ml-4">
            <li>
              <strong>Local Test:</strong> Adds notification to React state only
            </li>
            <li>
              <strong>Database Test:</strong> Inserts into database and waits
              for real-time update
            </li>
            <li>Watch the debug log for real-time events and timing</li>
            <li>Check browser console for detailed Supabase logs</li>
            <li>Toggle realtime on/off to test fallback behavior</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
