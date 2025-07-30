# Supabase Realtime Environment Variables

This document explains the environment variables needed for the Direct Supabase Realtime implementation.

## Required Environment Variables

### Basic Supabase Configuration

```bash
# Primary Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE
```

### Realtime-Specific Configuration

```bash
# Optional: Custom Realtime WebSocket URL (will be auto-constructed if not provided)
NEXT_PUBLIC_REALTIME_URL=ws://localhost:54321/realtime/v1/websocket

# Optional: JWT secret for server-side Realtime operations
REALTIME_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long

# Optional: Database connection for self-hosted Realtime server
REALTIME_DB_HOST=localhost
REALTIME_DB_PORT=54321
REALTIME_DB_NAME=postgres
REALTIME_DB_USER=postgres
REALTIME_DB_PASSWORD=postgres
```

## Port Configuration

### ⚠️ Important: Port 54321 vs 8000

Most Supabase local installations use **port 54321**, not 8000. If you're experiencing channel errors, check your port:

**Correct (Default Supabase):**

```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
```

**Incorrect (Common Mistake):**

```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000  # This causes channel errors
```

### Finding Your Correct Port

1. **Check your Supabase CLI status:**

   ```bash
   supabase status
   ```

2. **Check running Docker containers:**

   ```bash
   docker ps | grep supabase
   ```

3. **Common Supabase ports:**
   - API: `54321`
   - DB: `54322`
   - Studio: `54323`
   - Inbucket: `54324`
   - GoTrue: `54325`
   - Realtime: `54326`

## WebSocket URL Formats

### Local Development

```
ws://localhost:54321/realtime/v1/websocket?apikey=[anon-key]&log_level=info&vsn=1.0.0
```

### Production (Supabase Cloud)

```
wss://[project-ref].supabase.co/realtime/v1/websocket?apikey=[anon-token]&log_level=info&vsn=1.0.0
```

### Self-hosted

```
ws://[external_id].localhost:4000/socket/websocket
```

## Environment Variable Usage

### 1. Basic Configuration Check

```typescript
const isConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
```

### 2. WebSocket URL Construction

```typescript
const websocketUrl =
  process.env.NEXT_PUBLIC_REALTIME_URL ||
  `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(
    "http",
    "ws"
  )}/realtime/v1/websocket`;
```

### 3. Connection Parameters

```typescript
const config = {
  url: websocketUrl,
  apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  params: {
    eventsPerSecond: 10,
    heartbeatIntervalMs: 30000,
    logger: (kind, msg, data) => console.log(`[Realtime ${kind}]`, msg, data),
  },
};
```

## Troubleshooting

### Common Issues and Solutions

1. **Channel Error - Falling back to polling**

   - **Cause:** Wrong port (8000 instead of 54321)
   - **Solution:** Update `NEXT_PUBLIC_SUPABASE_URL` to use port 54321

2. **Connection Timeout**

   - **Cause:** Supabase not running or wrong URL
   - **Solution:** Start Supabase CLI and verify URL

3. **Invalid JWT**

   - **Cause:** Wrong or expired anon key
   - **Solution:** Get fresh anon key from Supabase dashboard

4. **WebSocket Connection Failed**
   - **Cause:** Firewall or network issues
   - **Solution:** Check network connectivity and firewall rules

### Testing Your Configuration

Use the test page at `/test-realtime` to verify your configuration:

```bash
# Start your Next.js app
npm run dev

# Visit the test page
open http://localhost:3000/test-realtime
```

## Migration Guide

### From Old Implementation (supabase-js) to Direct Library

1. **Update environment variables** (change port to 54321)
2. **Install direct library**: `npm install @supabase/realtime-js`
3. **Update your components** to use `useDirectRealtime` hook
4. **Test the connection** with the diagnostic tools

### Example Migration

**Before (supabase-js):**

```typescript
import { useNotificationRealtime } from "@/hooks/use-notification-realtime";

const { isConnected } = useNotificationRealtime({
  userId: "user-123",
  enabled: true,
});
```

**After (direct library):**

```typescript
import { useDirectRealtime } from "@/hooks/use-direct-realtime";

const { isConnected, error, reconnect } = useDirectRealtime({
  userId: "user-123",
  enabled: true,
});
```

## Production Considerations

### For Supabase Cloud

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
# NEXT_PUBLIC_REALTIME_URL will be auto-constructed
```

### For Self-hosted

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-domain.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_REALTIME_URL=wss://your-domain.com/realtime/v1/websocket
```

## Security Notes

1. **Never expose service_role keys** in client-side environment variables
2. **Use NEXT*PUBLIC* prefix** only for client-safe variables
3. **Keep JWT secrets secure** and server-side only
4. **Rotate keys regularly** in production environments

## Resources

- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [Realtime JavaScript Client](https://github.com/supabase/realtime-js)
- [Supabase Local Development](https://supabase.com/docs/guides/cli)
