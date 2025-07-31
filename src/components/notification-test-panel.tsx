/**
 * Notification System Test & Debug Utility
 *
 * This component helps test and debug the notification system fixes:
 * 1. UI Bug: Panel overflow fixed with proper scrolling
 * 2. Realtime Bug: Connection status and fallback behavior
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "ui/card";
import { Badge } from "ui/badge";
import { ScrollArea } from "ui/scroll-area";
import { AlertCircle, CheckCircle, XCircle, Wifi, WifiOff } from "lucide-react";
import {
  isSupabaseConfigured,
  isSupabaseRealtimeAvailable,
} from "@/lib/supabase";
import { useNotifications } from "@/hooks/use-notifications";
import { authClient } from "auth/client";

export function NotificationTestPanel() {
  const [testResults, setTestResults] = useState<{
    supabaseConfigured: boolean;
    realtimeAvailable: boolean;
    envVarsSet: boolean;
    connectionStatus: string;
  }>({
    supabaseConfigured: false,
    realtimeAvailable: false,
    envVarsSet: false,
    connectionStatus: "unknown",
  });

  const { notifications, addNotification, unreadCount } = useNotifications();
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  useEffect(() => {
    // Run diagnostic tests
    const runTests = () => {
      const supabaseConfigured = isSupabaseConfigured();
      const realtimeAvailable = isSupabaseRealtimeAvailable();
      const envVarsSet = !!(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      setTestResults({
        supabaseConfigured,
        realtimeAvailable,
        envVarsSet,
        connectionStatus: realtimeAvailable ? "realtime" : "polling",
      });

      console.log("🧪 Notification System Diagnostics:", {
        supabaseConfigured,
        realtimeAvailable,
        envVarsSet,
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        notificationCount: notifications.length,
        unreadCount,
      });
    };

    runTests();
  }, [notifications.length, unreadCount]);

  const createDatabaseNotification = async () => {
    if (!userId || !testResults.supabaseConfigured) {
      console.warn(
        "❌ Cannot create database notification: No user ID or Supabase not configured",
      );
      return;
    }

    try {
      console.log("🗄️ Creating notification directly in database...");

      // Import Supabase client
      const { supabase } = await import("@/lib/supabase");

      if (!supabase) {
        console.error("❌ Supabase client not available");
        return;
      }

      const newNotification = {
        id: `db-test-${Date.now()}`,
        user_id: userId,
        type: "info",
        message: `Database Test Notification - ${new Date().toLocaleTimeString()}. This notification was inserted directly into the database to test real-time updates.`,
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
        console.error("❌ Database insertion failed:", error);
        // Fallback to local notification
        addNotification({
          id: newNotification.id,
          userId: newNotification.user_id,
          type: newNotification.type as "info",
          message:
            newNotification.message + " (Local fallback - DB insert failed)",
          payload: newNotification.payload,
          isRead: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        console.log("✅ Notification inserted into database:", data);
        console.log(
          "🔄 If real-time is working, you should see this notification appear automatically",
        );
        console.log(
          "⏳ If using polling, it may take up to 15 seconds to appear",
        );
      }
    } catch (error) {
      console.error("❌ Error creating database notification:", error);
    }
  };

  const createTestNotifications = () => {
    // Create multiple notifications to test UI overflow
    const testNotifications = [
      {
        id: `test-${Date.now()}-1`,
        userId: "test-user",
        type: "info" as const,
        message:
          "Test Info Notification - This is a test info notification to verify the UI overflow fix works correctly.",
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: `test-${Date.now()}-2`,
        userId: "test-user",
        type: "actionable" as const,
        message:
          "Test Actionable Notification - This is a test actionable notification with a longer message to check text wrapping and scrolling behavior in the notification panel.",
        actionStatus: "pending" as const,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: `test-${Date.now()}-3`,
        userId: "test-user",
        type: "info" as const,
        message:
          "Test Info Notification #2 - Another info notification for testing.",
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: `test-${Date.now()}-4`,
        userId: "test-user",
        type: "actionable" as const,
        message:
          "Test Actionable Notification #2 - This is a test actionable notification to verify all notification types display correctly.",
        actionStatus: "pending" as const,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: `test-${Date.now()}-5`,
        userId: "test-user",
        type: "info" as const,
        message:
          "Scrolling Test #1 - This notification tests if the panel properly scrolls when there are many notifications.",
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: `test-${Date.now()}-6`,
        userId: "test-user",
        type: "info" as const,
        message:
          "Scrolling Test #2 - Another notification to fill up the panel and test scrolling behavior.",
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: `test-${Date.now()}-7`,
        userId: "test-user",
        type: "info" as const,
        message:
          "Scrolling Test #3 - Yet another notification to ensure the overflow fix works with many items.",
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: `test-${Date.now()}-8`,
        userId: "test-user",
        type: "info" as const,
        message:
          "Scrolling Test #4 - Final test notification to verify the panel height constraint and scrolling.",
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    testNotifications.forEach((notification, index) => {
      setTimeout(() => {
        addNotification(notification);
      }, index * 500); // Stagger notifications
    });
  };

  const StatusIcon = ({ status }: { status: boolean }) =>
    status ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );

  const ConnectionIcon = ({ type }: { type: string }) =>
    type === "realtime" ? (
      <Wifi className="h-4 w-4 text-green-500" />
    ) : (
      <WifiOff className="h-4 w-4 text-yellow-500" />
    );

  return (
    <Card className="w-full max-w-2xl mx-auto m-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Notification System Test Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* System Status */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">System Status</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm">Supabase Configured</span>
              <div className="flex items-center gap-2">
                <StatusIcon status={testResults.supabaseConfigured} />
                <Badge
                  variant={
                    testResults.supabaseConfigured ? "default" : "destructive"
                  }
                >
                  {testResults.supabaseConfigured ? "Yes" : "No"}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm">Realtime Available</span>
              <div className="flex items-center gap-2">
                <StatusIcon status={testResults.realtimeAvailable} />
                <Badge
                  variant={
                    testResults.realtimeAvailable ? "default" : "secondary"
                  }
                >
                  {testResults.realtimeAvailable ? "Yes" : "No"}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm">Connection Mode</span>
              <div className="flex items-center gap-2">
                <ConnectionIcon type={testResults.connectionStatus} />
                <Badge
                  variant={
                    testResults.connectionStatus === "realtime"
                      ? "default"
                      : "secondary"
                  }
                >
                  {testResults.connectionStatus === "realtime"
                    ? "Real-time"
                    : "Polling"}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm">Current Notifications</span>
              <Badge variant="outline">
                {notifications.length} total ({unreadCount} unread)
              </Badge>
            </div>
          </div>
        </div>

        {/* Environment Variables */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Environment Configuration</h3>
          <ScrollArea className="h-32 p-3 border rounded-lg bg-muted/50">
            <div className="space-y-1 text-xs font-mono">
              <div>
                NEXT_PUBLIC_SUPABASE_URL:{" "}
                {process.env.NEXT_PUBLIC_SUPABASE_URL || "not set"}
              </div>
              <div>
                NEXT_PUBLIC_SUPABASE_ANON_KEY:{" "}
                {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "set" : "not set"}
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Test Actions */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Test Actions</h3>
          <div className="flex gap-3 flex-wrap">
            <Button onClick={createTestNotifications} variant="outline">
              Create Local Test Notifications
            </Button>
            <Button
              onClick={createDatabaseNotification}
              variant="outline"
              disabled={!testResults.supabaseConfigured || !userId}
            >
              Create Database Notification
            </Button>
            <Button onClick={() => window.location.reload()} variant="outline">
              Refresh Page
            </Button>
          </div>
          {(!testResults.supabaseConfigured || !userId) && (
            <p className="text-xs text-muted-foreground">
              Database test requires Supabase configuration and user
              authentication
            </p>
          )}
        </div>

        {/* Instructions */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Testing Instructions</h3>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>UI Overflow Test:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>
                Click "Create Local Test Notifications" to add multiple
                notifications
              </li>
              <li>Open the notification panel (bell icon in top-right)</li>
              <li>Verify the panel has a fixed height and scrolls properly</li>
              <li>The panel should not exceed the visible screen area</li>
            </ol>

            <p>
              <strong>Real-time Test:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Check if "Connection Mode" shows "Real-time" or "Polling"</li>
              <li>
                Click "Create Database Notification" - this inserts directly
                into the database
              </li>
              <li>If real-time is working: notification appears immediately</li>
              <li>If polling: notification appears within 15 seconds</li>
              <li>Check browser console for detailed connection logs</li>
            </ol>

            <p>
              <strong>Debug Steps:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Open browser console before testing</li>
              <li>Look for "✅ Successfully subscribed" message</li>
              <li>
                If you see repeated "Setting up" messages, the subscription is
                being recreated
              </li>
              <li>The latest fix should prevent subscription recreation</li>
            </ol>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
