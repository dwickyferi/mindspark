#!/bin/bash

# Update all remaining API routes to use getSessionForApi instead of getSession

# List of files to update
files=(
    "src/app/api/analytics/table-details/route.ts"
    "src/app/api/mcp/server-customizations/[server]/route.ts"
    "src/app/api/notifications/respond/route.ts"
    "src/app/api/mcp/tool-customizations/[server]/route.ts"
    "src/app/api/mcp/tool-customizations/[server]/[tool]/route.ts"
    "src/app/api/notifications/test-invite/route.ts"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "Updating $file..."
        # Replace the import
        sed -i '' 's/import { getSession } from "auth\/server";/import { getSessionForApi } from "auth\/server";/g' "$file"
        sed -i '' 's/import { getSession } from "lib\/auth\/server";/import { getSessionForApi } from "lib\/auth\/server";/g' "$file"
        
        # Replace the function calls
        sed -i '' 's/await getSession()/await getSessionForApi()/g' "$file"
        
        echo "Updated $file"
    else
        echo "File $file does not exist, skipping..."
    fi
done

echo "Finished updating API routes!"
