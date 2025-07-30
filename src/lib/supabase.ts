import { createClient } from "@supabase/supabase-js";

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Create a Supabase client instance if credentials are available
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
          // Use the full WebSocket URL if available, otherwise let Supabase construct it
          ...(process.env.NEXT_PUBLIC_REALTIME_URL && {
            websocketURL: process.env.NEXT_PUBLIC_REALTIME_URL,
          }),
        },
      })
    : null;

// Helper function to check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// Helper function to check if Supabase realtime is available
export function isSupabaseRealtimeAvailable(): boolean {
  return isSupabaseConfigured() && supabase !== null;
}

// Export configuration values for reference
export const config = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  realtimeUrl: process.env.NEXT_PUBLIC_REALTIME_URL,
  isConfigured: isSupabaseConfigured(),
  isRealtimeAvailable: isSupabaseRealtimeAvailable(),
};
