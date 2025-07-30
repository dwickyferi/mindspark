/**
 * Simple Node.js script to test Supabase realtime connection
 * Run with: node test-realtime.js
 */

const { createClient } = require("@supabase/supabase-js");

// Use your actual Supabase configuration
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:8000";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "test-anon-key";

console.log("Testing Supabase connection...");
console.log("URL:", supabaseUrl);
console.log("Has Anon Key:", !!supabaseAnonKey);

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Test the connection
async function testConnection() {
  try {
    console.log("\n📡 Testing Supabase connection...");

    // Try to fetch data to test if Supabase is running
    const { data, error } = await supabase
      .from("notification")
      .select("count")
      .limit(1);

    if (error) {
      console.error("❌ Connection failed:", error.message);
      console.log("\n💡 Possible issues:");
      console.log("1. Supabase server is not running");
      console.log("2. Wrong URL or credentials");
      console.log('3. Table "notification" does not exist');
      return false;
    }

    console.log("✅ Connection successful!");
    return true;
  } catch (err) {
    console.error("❌ Connection error:", err.message);
    return false;
  }
}

// Test realtime subscription
function testRealtime() {
  console.log("\n🔄 Setting up realtime subscription...");

  const channel = supabase
    .channel("test-notifications")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notification",
      },
      (payload) => {
        console.log("🔔 Received realtime event:", payload);
      },
    )
    .subscribe((status, error) => {
      console.log("📡 Subscription status:", status);
      if (error) {
        console.error("❌ Subscription error:", error);
      }
      if (status === "SUBSCRIBED") {
        console.log("✅ Successfully subscribed to realtime updates!");
        console.log(
          "\n🧪 To test: Insert/update/delete a notification in your database",
        );
        console.log("Press Ctrl+C to exit");
      }
    });
}

// Run the test
async function main() {
  const connected = await testConnection();

  if (connected) {
    testRealtime();
  } else {
    console.log("\n🔧 To fix connection issues:");
    console.log("1. Make sure your Supabase/PostgreSQL server is running");
    console.log("2. Check your environment variables in .env.local");
    console.log("3. Verify the notification table exists in your database");
    process.exit(1);
  }
}

main().catch(console.error);

// Keep the process running
process.on("SIGINT", () => {
  console.log("\n👋 Goodbye!");
  process.exit(0);
});
