import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  console.log("🔧 Testing Supabase Realtime Connection (Server-side)");

  try {
    // Get environment variables (server-side)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const realtimeUrl = process.env.NEXT_PUBLIC_REALTIME_URL;
    const realtimeJwtSecret = process.env.REALTIME_JWT_SECRET;

    console.log("📊 Environment Variables Check:", {
      supabaseUrl: supabaseUrl ? "✅ Set" : "❌ Missing",
      supabaseAnonKey: supabaseAnonKey ? "✅ Set" : "❌ Missing",
      realtimeUrl: realtimeUrl ? "✅ Set" : "❌ Missing",
      realtimeJwtSecret: realtimeJwtSecret ? "✅ Set" : "❌ Missing",
    });

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing Supabase configuration",
          details: {
            supabaseUrl: !!supabaseUrl,
            supabaseAnonKey: !!supabaseAnonKey,
          },
        },
        { status: 500 },
      );
    }

    // Create Supabase client with realtime configuration
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });

    console.log("🔌 Testing Supabase client creation...");

    // Test basic connection
    const { data: connectionTest, error: connectionError } = await supabase
      .from("notification")
      .select("count", { count: "exact", head: true });

    if (connectionError) {
      console.error("❌ Database connection error:", connectionError);
      return NextResponse.json(
        {
          success: false,
          error: "Database connection failed",
          details: connectionError,
        },
        { status: 500 },
      );
    }

    console.log("✅ Database connection successful");

    // Test realtime channel creation
    const testChannel = supabase.channel("test-realtime-connection").on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notification",
      },
      (payload) => {
        console.log("📨 Realtime payload received:", payload);
      },
    );

    // Subscribe and test
    const subscriptionPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Subscription timeout"));
      }, 10000); // 10 second timeout

      testChannel.subscribe((status, error) => {
        console.log("📡 Subscription status:", status);

        clearTimeout(timeout);

        if (error) {
          console.error("❌ Subscription error:", error);
          reject(error);
        } else if (status === "SUBSCRIBED") {
          console.log("✅ Successfully subscribed to realtime");
          resolve(status);
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Channel error occurred");
          reject(new Error("Channel error"));
        } else if (status === "TIMED_OUT") {
          console.error("⏰ Subscription timed out");
          reject(new Error("Subscription timed out"));
        }
      });
    });

    let subscriptionResult;
    try {
      subscriptionResult = await subscriptionPromise;
      console.log("🎉 Subscription successful:", subscriptionResult);
    } catch (subscriptionError) {
      console.error("💥 Subscription failed:", subscriptionError);

      // Clean up
      await supabase.removeChannel(testChannel);

      return NextResponse.json(
        {
          success: false,
          error: "Realtime subscription failed",
          details: {
            subscriptionError:
              subscriptionError instanceof Error
                ? subscriptionError.message
                : String(subscriptionError),
            connectionTest: !!connectionTest,
          },
          troubleshooting: {
            suggestions: [
              "Check if Supabase is running on the correct port (8000)",
              "Verify NEXT_PUBLIC_REALTIME_URL is set to ws://localhost:8000",
              "Ensure realtime is enabled in Supabase configuration",
              "Check if notification table exists and has RLS policies",
            ],
          },
        },
        { status: 500 },
      );
    }

    // Clean up the test channel
    await supabase.removeChannel(testChannel);

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Realtime connection test successful",
      details: {
        environment: {
          supabaseUrl,
          realtimeUrl,
          hasJwtSecret: !!realtimeJwtSecret,
        },
        connectionTest: {
          dbConnected: true,
          realtimeSubscribed: true,
        },
        channels: supabase.getChannels().length,
      },
    });
  } catch (error) {
    console.error("💥 Unexpected error during realtime test:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unexpected error during realtime test",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  console.log("🧪 Testing Realtime with Mock Notification");

  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "userId is required for testing",
        },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing Supabase configuration",
        },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Create a test notification to trigger realtime
    const { data: notification, error: insertError } = await supabase
      .from("notification")
      .insert({
        user_id: userId,
        type: "test",
        title: "Realtime Test Notification",
        message: "This is a test notification to verify realtime functionality",
        created_at: new Date().toISOString(),
        read: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Failed to create test notification:", insertError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create test notification",
          details: insertError,
        },
        { status: 500 },
      );
    }

    console.log("✅ Test notification created:", notification);

    return NextResponse.json({
      success: true,
      message: "Test notification created successfully",
      notification,
    });
  } catch (error) {
    console.error("💥 Error creating test notification:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create test notification",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
