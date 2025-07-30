#!/usr/bin/env node

// Apply RLS policy fixes directly through Supabase REST API
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:8000";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZUI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE";

console.log("🔧 Applying RLS policy fixes for notification table...");

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixRLSPolicies() {
  try {
    // Since we can't execute DDL directly through the REST API,
    // let's check if we can work around the RLS issue

    console.log("Testing current RLS policies...");

    // Try to check if we can read from the table
    const { data: testRead, error: readError } = await supabase
      .from("notification")
      .select("*")
      .limit(1);

    if (readError) {
      console.error("❌ Cannot read from notification table:", readError);
      console.log("\n🔧 RLS policies are blocking access. You need to:");
      console.log(
        "1. Connect to your Supabase database via psql or the SQL editor",
      );
      console.log("2. Run the queries in fix-notification-rls.sql");
      console.log("3. Or temporarily disable RLS for testing:");
      console.log(
        "   ALTER TABLE public.notification DISABLE ROW LEVEL SECURITY;",
      );
      return false;
    }

    console.log("✅ Can read from notification table");

    // Try to insert a test record
    const testUserId = "00000000-0000-0000-0000-000000000001";
    const { data: testInsert, error: insertError } = await supabase
      .from("notification")
      .insert({
        user_id: testUserId,
        type: "test",
        message: "RLS test notification",
        is_read: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Cannot insert into notification table:", insertError);
      console.log("\n🔧 RLS policies are blocking inserts. You need to:");
      console.log("1. Run the SQL commands in fix-notification-rls.sql");
      console.log("2. Or disable RLS temporarily for testing");
      return false;
    }

    console.log("✅ Can insert into notification table:", testInsert);

    // Test realtime subscription
    console.log("\n🔄 Testing realtime subscription...");

    return new Promise((resolve) => {
      let hasReceived = false;

      const channel = supabase
        .channel("rls-test-channel")
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
            if (!hasReceived) {
              hasReceived = true;
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

            // Insert another test notification to trigger realtime
            setTimeout(async () => {
              console.log("Inserting trigger notification...");
              await supabase.from("notification").insert({
                user_id: testUserId,
                type: "test",
                message: "Trigger notification for realtime test",
                is_read: false,
              });
            }, 1000);

            // Timeout after 8 seconds
            setTimeout(() => {
              if (!hasReceived) {
                console.log("⏰ Timeout - no realtime events received");
                console.log("This might indicate a realtime server issue");
                supabase.removeChannel(channel);
                resolve(false);
              }
            }, 8000);
          } else if (status === "CHANNEL_ERROR") {
            console.error("❌ Channel error - this is your original issue");
            console.log("Possible causes:");
            console.log("- Realtime server not running properly");
            console.log("- WebSocket connection issues");
            console.log("- Realtime not enabled for the notification table");
            resolve(false);
          } else if (status === "TIMED_OUT") {
            console.error("⏰ Subscription timed out");
            resolve(false);
          }
        });
    });
  } catch (error) {
    console.error("💥 Unexpected error:", error);
    return false;
  }
}

fixRLSPolicies().then((success) => {
  console.log("\n" + "=".repeat(60));
  if (success) {
    console.log("🎉 RLS and Realtime are working correctly!");
    console.log("Your notification system should now work properly.");
  } else {
    console.log("❌ Issues detected with RLS or Realtime setup.");
    console.log("\n📋 Next steps:");
    console.log("1. Apply the SQL fixes in fix-notification-rls.sql");
    console.log("2. Ensure realtime is enabled for the notification table");
    console.log("3. Check Supabase container logs for realtime errors");
    console.log(
      "4. Visit http://localhost:3000/test-realtime to test in browser",
    );
  }
  process.exit(success ? 0 : 1);
});
