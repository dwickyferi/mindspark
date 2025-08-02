import { NextRequest } from "next/server";
import { getSession } from "lib/auth/server";
import { streamText } from "ai";
import { customModelProvider } from "@/lib/ai/models";

// Import analytics tools
import { APP_DEFAULT_TOOL_KIT } from "lib/ai/tools/tool-kit";
import { AppDefaultToolkit } from "lib/ai/tools";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
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
      // Get the original tools
      const analyticsTools = {
        ...APP_DEFAULT_TOOL_KIT[AppDefaultToolkit.Analytics],
      };

      // Create a modified textToSql tool that has access to the current model context
      if (analyticsTools.textToSql) {
        const originalTextToSqlTool = analyticsTools.textToSql;

        // Create a new tool that wraps the original and injects model context
        analyticsTools.textToSql = {
          ...originalTextToSqlTool,
          execute: async (params: any, options?: any) => {
            // Get the provider and model from the current chat model
            const aiProvider = chatModel?.provider || "openai";
            const aiModel = chatModel?.model || "gpt-4";

            // Validate that the provider is one of our supported static model providers
            const supportedProviders = [
              "openai",
              "qwen",
              "xai",
              "anthropic",
              "kimi",
              "deepseek",
              "google",
              "mistral",
              "zai",
            ];

            const finalProvider = supportedProviders.includes(aiProvider)
              ? aiProvider
              : "openai"; // fallback to openai if provider not recognized

            // Inject the current model information into the parameters
            const enhancedParams = {
              ...params,
              aiProvider: finalProvider,
              aiModel: aiModel,
            };

            console.log(
              "[Studio Chat] Enhanced textToSql params with model context:",
              {
                originalProvider: chatModel?.provider,
                finalProvider: finalProvider,
                model: enhancedParams.aiModel,
                supportedProviders,
              },
            );

            // Call the original tool with enhanced parameters
            return originalTextToSqlTool.execute!(enhancedParams, options);
          },
        };
      }

      Object.assign(tools, analyticsTools);
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
