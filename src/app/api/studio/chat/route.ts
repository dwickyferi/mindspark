import { NextRequest } from "next/server";
import { getSessionForApi } from "lib/auth/server";
import { streamText } from "ai";
import { customModelProvider } from "@/lib/ai/models";

// Import analytics tools
import { APP_DEFAULT_TOOL_KIT } from "lib/ai/tools/tool-kit";
import { AppDefaultToolkit } from "lib/ai/tools";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionForApi();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      messages,
      chatModel,
      toolChoice = "auto",
      allowedAppDefaultToolkit = ["analytics"],
    } = body;

    // Use the centralized model provider
    const model = customModelProvider.getModel(chatModel);

    // Prepare tools based on allowed toolkit
    const tools: any = {};

    if (allowedAppDefaultToolkit.includes("analytics")) {
      Object.assign(tools, APP_DEFAULT_TOOL_KIT[AppDefaultToolkit.Analytics]);
    }

    console.log(
      "[Studio Chat] Processing request with tools:",
      Object.keys(tools),
    );

    // Stream the response without persisting to database
    const result = await streamText({
      model,
      messages,
      tools,
      toolChoice,
      maxTokens: 4000,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Studio chat error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
