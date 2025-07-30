import { RealtimeClient } from "@supabase/realtime-js";

export interface RealtimeConfig {
  url: string;
  apikey: string;
  params?: {
    eventsPerSecond?: number;
    heartbeatIntervalMs?: number;
    logger?: (kind: string, msg: string, data?: any) => void;
    encode?: (payload: object, callback: (encoded: string) => void) => void;
    decode?: (payload: string, callback: (decoded: object) => void) => void;
    transport?: any;
    timeout?: number;
    longpollerTimeout?: number;
    reconnectAfterMs?: (tries: number) => number;
  };
}

export interface NotificationRealtimeConfig extends RealtimeConfig {
  userId: string;
  schema?: string;
  table?: string;
  filter?: string;
}

// Default configuration for Supabase Realtime
export const getRealtimeConfig = (): RealtimeConfig => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const realtimeUrl = process.env.NEXT_PUBLIC_REALTIME_URL;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }

  // Use custom realtime URL if provided, otherwise construct from Supabase URL
  const websocketUrl =
    realtimeUrl || `${supabaseUrl.replace("http", "ws")}/realtime/v1/websocket`;

  return {
    url: websocketUrl,
    apikey: supabaseKey,
    params: {
      eventsPerSecond: 10,
      heartbeatIntervalMs: 30000,
      logger: (kind: string, msg: string, data?: any) => {
        console.log(`[Realtime ${kind}]`, msg, data);
      },
      timeout: 10000,
      longpollerTimeout: 20000,
      reconnectAfterMs: (tries: number) => {
        // Exponential backoff with jitter
        const baseDelay = 1000;
        const maxDelay = 30000;
        const exponentialDelay = Math.min(
          baseDelay * Math.pow(2, tries),
          maxDelay,
        );
        const jitter = Math.random() * 0.1 * exponentialDelay;
        return exponentialDelay + jitter;
      },
    },
  };
};

export const getNotificationRealtimeConfig = (
  userId: string,
): NotificationRealtimeConfig => {
  const baseConfig = getRealtimeConfig();

  return {
    ...baseConfig,
    userId,
    schema: "public",
    table: "notification",
    filter: `user_id=eq.${userId}`,
  };
};

// Create a singleton Realtime client
let realtimeClient: RealtimeClient | null = null;

export const getRealtimeClient = (): RealtimeClient => {
  if (!realtimeClient) {
    const config = getRealtimeConfig();
    realtimeClient = new RealtimeClient(config.url, {
      params: {
        apikey: config.apikey,
        ...config.params,
      },
    });
  }

  return realtimeClient;
};

// Cleanup function
export const disconnectRealtime = () => {
  if (realtimeClient) {
    realtimeClient.disconnect();
    realtimeClient = null;
  }
};

// Health check function
export const checkRealtimeHealth = async (): Promise<{
  connected: boolean;
  channels: number;
  error?: string;
}> => {
  try {
    const client = getRealtimeClient();

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          connected: false,
          channels: 0,
          error: "Connection timeout",
        });
      }, 5000);

      // Connect the client
      client.connect();

      // Create a test channel to verify connection
      const testChannel = client.channel("test-health-check");

      testChannel.subscribe((status, error) => {
        clearTimeout(timeout);

        if (status === "SUBSCRIBED") {
          testChannel.unsubscribe();
          resolve({
            connected: true,
            channels: client.channels.length,
          });
        } else if (status === "CHANNEL_ERROR" || error) {
          resolve({
            connected: false,
            channels: 0,
            error:
              error?.message || `Subscription failed with status: ${status}`,
          });
        }
      });
    });
  } catch (error) {
    return {
      connected: false,
      channels: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
