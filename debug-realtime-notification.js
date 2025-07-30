#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

// Use the same environment variables as your app
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:8000";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

async function debugRealtimeNotification() {
  console.log("🔧 Debugging realtime notification system...");

  // Test user ID (same as used in test page)
  const testUserId = "3dbc6b8a-3699-4b0a-a0e9-44557b0aed7b";

  console.log(`📡 Setting up realtime subscription for user: ${testUserId}`);

  // Set up subscription like the useNotificationRealtime hook does
  const channel = supabase
    .channel(`debug-notifications-${testUserId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notification",
        filter: `user_id=eq.${testUserId}`,
      },
      (payload) => {
        console.log("🎯 REALTIME EVENT RECEIVED:", payload);
        console.log("📊 Event Type:", payload.eventType);
        console.log("📧 New Record:", payload.new);
        console.log("👤 User ID from record:", payload.new?.user_id);
      },
    )
    .subscribe((status, error) => {
      console.log("📡 Subscription status:", status);
      if (error) {
        console.error("❌ Subscription error:", error);
      }
    });

  // Wait for subscription to be ready
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log("📤 Creating test notification...");

  // Create a test notification
  const { data, error } = await supabase
    .from("notification")
    .insert({
      user_id: testUserId,
      type: "test",
      message: `Debug test notification - ${new Date().toLocaleTimeString()}`,
      is_read: false,
    })
    .select()
    .single();

  if (error) {
    console.error("❌ Failed to create notification:", error);
  } else {
    console.log("✅ Test notification created:", data.id);
  }

  // Wait for realtime event
  console.log("⏳ Waiting 5 seconds for realtime event...");
  await new Promise((resolve) => setTimeout(resolve, 5000));

  console.log("🧹 Cleaning up...");
  supabase.removeChannel(channel);

  console.log("✅ Debug complete");
  process.exit(0);
}

debugRealtimeNotification().catch(console.error);
