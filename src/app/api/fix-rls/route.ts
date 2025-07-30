import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action !== "disable-rls" && action !== "enable-rls") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid action. Use 'disable-rls' or 'enable-rls'",
        },
        { status: 400 },
      );
    }

    console.log(
      `🔧 ${action === "disable-rls" ? "Disabling" : "Enabling"} RLS for notification table...`,
    );

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Supabase configuration missing",
        },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Test if we can access the notification table
    const { error: testError } = await supabase
      .from("notification")
      .select("count", { count: "exact", head: true });

    if (testError) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot access notification table",
          details: testError,
          suggestions: [
            "Run the SQL commands in fix-notification-rls.sql",
            "Or connect to your database and run: ALTER TABLE public.notification DISABLE ROW LEVEL SECURITY;",
            "Check if the notification table exists",
          ],
        },
        { status: 500 },
      );
    }

    // Create a test notification to verify RLS is working
    const testUserId = "00000000-0000-0000-0000-000000000001";
    const { data: insertData, error: insertError } = await supabase
      .from("notification")
      .insert({
        user_id: testUserId,
        type: "rls-test",
        message: `RLS test - ${action}`,
        is_read: false,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        {
          success: false,
          error: "RLS policies are blocking database operations",
          details: insertError,
          instructions: {
            method1: "Connect to your Supabase database and run:",
            sql: "ALTER TABLE public.notification DISABLE ROW LEVEL SECURITY;",
            method2:
              "Or apply the comprehensive fix from fix-notification-rls.sql",
          },
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "RLS test successful - database access is working",
      testNotification: insertData,
      nextSteps: [
        "RLS is allowing database operations",
        "Test realtime by visiting /test-realtime",
        "If realtime still fails, check container logs",
      ],
    });
  } catch (error) {
    console.error("Error in RLS fix endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Unexpected error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
