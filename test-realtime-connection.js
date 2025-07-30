#!/usr/bin/env node

// Quick test to verify Supabase connection and notification table
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:8000";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";

console.log("🔧 Testing Supabase connection...");
console.log("URL:", supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    // Test basic connection
    console.log("\n1. Testing basic REST connection...");
    const { data, error, count } = await supabase
      .from("notification")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error("❌ REST connection failed:", error);
      return false;
    }

    console.log("✅ REST connection successful");
    console.log("Notification table exists with", count || 0, "records");

    // Test inserting a test notification
    console.log("\n2. Testing notification insertion...");
    const testUserId = "3dbc6b8a-3699-4b0a-a0e9-44557b0aed7b"; // Valid UUID format
    const { data: insertData, error: insertError } = await supabase
      .from("notification")
      .insert({
        user_id: testUserId,
        type: "test",
        message: "Test notification for realtime",
        is_read: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Insert failed:", insertError);
      return false;
    }

    console.log("✅ Test notification inserted:", insertData);

    // Test realtime subscription
    console.log("\n3. Testing realtime subscription...");

    return new Promise((resolve) => {
      let eventReceived = false;

      const channel = supabase
        .channel("test-realtime")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notification",
            filter: `user_id=eq.${testUserId}`,
          },
          (payload) => {
            console.log("🎉 Realtime event received:", payload);
            if (!eventReceived) {
              eventReceived = true;
              console.log("✅ Realtime is working correctly!");
              supabase.removeChannel(channel);
              resolve(true);
            }
          },
        )
        .subscribe((status, error) => {
          console.log("📡 Subscription status:", status);

          if (error) {
            console.error("❌ Subscription error:", error);
            resolve(false);
            return;
          }

          if (status === "SUBSCRIBED") {
            console.log("✅ Realtime subscription successful");

            // Create another test notification to trigger realtime
            setTimeout(async () => {
              console.log("Inserting second test notification...");
              const { error: secondInsertError } = await supabase
                .from("notification")
                .insert({
                  user_id: testUserId,
                  type: "test",
                  message: "Second test notification",
                  is_read: false,
                });

              if (secondInsertError) {
                console.error("❌ Second insert failed:", secondInsertError);
              }
            }, 2000);

            // Timeout after 10 seconds
            setTimeout(() => {
              if (!eventReceived) {
                console.log("⏰ Timeout - no realtime events received");
                supabase.removeChannel(channel);
                resolve(false);
              }
            }, 10000);
          } else if (status === "CHANNEL_ERROR") {
            console.error(
              "❌ Channel error - this is the issue you're experiencing",
            );
            resolve(false);
          }
        });
    });
  } catch (error) {
    console.error("💥 Unexpected error:", error);
    return false;
  }
}

testConnection().then((success) => {
  console.log("\n" + "=".repeat(50));
  if (success) {
    console.log("🎉 All tests passed! Realtime notifications are working.");
  } else {
    console.log("❌ Tests failed. Check the issues above.");
    console.log("\nTroubleshooting steps:");
    console.log("1. Ensure Supabase is running: docker-compose up -d");
    console.log("2. Check if the notification table exists");
    console.log("3. Verify RLS policies allow access to notifications");
    console.log("4. Check if realtime is enabled for the notification table");
  }
  process.exit(success ? 0 : 1);
});
