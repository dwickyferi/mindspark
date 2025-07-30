#!/bin/bash

# Setup script for testing notifications
echo "🔧 Setting up Supabase environment for notification testing..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "Creating .env.local file..."
    touch .env.local
fi

# Check if Supabase variables are already set
if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local; then
    echo "✅ Supabase URL already configured"
else
    echo "Adding Supabase URL configuration..."
    echo "" >> .env.local
    echo "# === Supabase Configuration (for notifications) ===" >> .env.local
    echo "NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000" >> .env.local
fi

if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local; then
    echo "✅ Supabase anon key already configured"
else
    echo "Adding Supabase anon key configuration..."
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key" >> .env.local
fi

echo ""
echo "📋 Current Supabase configuration:"
echo "NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000"
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key"
echo ""
echo "⚠️  NOTE: These are test values. For production, you'll need:"
echo "1. A real Supabase project URL"
echo "2. A real anon key from your Supabase dashboard"
echo "3. Proper database setup with notification table"
echo ""
echo "🚀 To test notifications without Supabase:"
echo "1. Comment out or remove the Supabase env vars"
echo "2. The system will automatically fall back to polling"
echo "3. Notifications will still work, just without real-time updates"
echo ""
echo "✅ Setup complete! Restart your dev server to apply changes."
