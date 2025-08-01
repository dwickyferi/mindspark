#!/usr/bin/env node
import { readFileSync, writeFileSync } from "fs";
import { glob } from "glob";

const projectRoot = process.cwd();

async function fixAuthImports() {
  console.log("🔧 Fixing auth imports in API routes...");

  // Find all API route files
  const apiFiles = await glob("src/app/api/**/*.ts", {
    cwd: projectRoot,
    absolute: true,
  });

  let filesModified = 0;

  for (const filePath of apiFiles) {
    try {
      let content = readFileSync(filePath, "utf-8");
      let modified = false;

      // Check if file uses getSession from auth/server or lib/auth/server
      if (
        content.includes("import { getSession }") &&
        (content.includes('from "auth/server"') ||
          content.includes('from "lib/auth/server"'))
      ) {
        console.log(`📝 Processing: ${filePath.replace(projectRoot, ".")}`);

        // Replace import statement for auth/server
        if (content.includes('import { getSession } from "auth/server"')) {
          content = content.replace(
            'import { getSession } from "auth/server"',
            'import { getSessionForApi } from "auth/server"',
          );
          modified = true;
        }

        // Replace import statement for lib/auth/server
        if (content.includes('import { getSession } from "lib/auth/server"')) {
          content = content.replace(
            'import { getSession } from "lib/auth/server"',
            'import { getSessionForApi } from "lib/auth/server"',
          );
          modified = true;
        }

        // Replace function calls and add auth checks
        const getSessionPattern = /const session = await getSession\(\);/g;
        content = content.replace(getSessionPattern, (match) => {
          return `const session = await getSessionForApi();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }`;
        });

        // For NextResponse imports, also handle those
        const nextResponsePattern =
          /const session = await getSession\(\);(\s*)([\s\S]*?session\.user\.id)/g;
        content = content.replace(
          nextResponsePattern,
          (match, whitespace, rest) => {
            return `const session = await getSessionForApi();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }${whitespace}${rest}`;
          },
        );

        if (modified || content !== readFileSync(filePath, "utf-8")) {
          writeFileSync(filePath, content);
          filesModified++;
          console.log(`✅ Fixed: ${filePath.replace(projectRoot, ".")}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error);
    }
  }

  console.log(`🎉 Done! Modified ${filesModified} files.`);
}

fixAuthImports().catch(console.error);
