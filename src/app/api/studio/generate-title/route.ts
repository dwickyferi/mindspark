import { generateText } from "ai";
import { customModelProvider } from "@/lib/ai/models";
import { getSession } from "auth/server";
import { z } from "zod";

const GenerateTitleRequestSchema = z.object({
  query: z.string(),
  data: z.array(z.any()),
  chartType: z.string(),
  chatModel: z
    .object({
      provider: z.string(),
      model: z.string(),
    })
    .optional(),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const json = await request.json();
    const { query, data, chartType, chatModel } =
      GenerateTitleRequestSchema.parse(json);

    // Analyze the data structure
    const dataKeys = data.length > 0 ? Object.keys(data[0]) : [];
    const dataSample = data.slice(0, 3);

    const prompt = `
      Based on the user query, data structure, and chart type, generate a concise, descriptive title for the chart.
      
      User Query: "${query}"
      Chart Type: ${chartType}
      Data Columns: ${dataKeys.join(", ")}
      Sample Data: ${JSON.stringify(dataSample, null, 2)}
      
      Generate a clear, professional chart title that describes what the chart shows.
      Keep it under 10 words and make it specific to the data being visualized.
      
      Respond with ONLY the title text, no quotes or additional formatting.
    `;

    // Use the same model provider as the chat system
    const model = customModelProvider.getModel(chatModel);

    const { text } = await generateText({
      model,
      system:
        "You are a data visualization expert. Generate concise, professional chart titles. Respond only with the title text.",
      prompt,
      temperature: 0.3,
      maxTokens: 100,
    });

    return Response.json({ title: text.trim() || query });
  } catch (error) {
    console.error("Error generating chart title:", error);

    // Return a more informative error response
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      {
        error: "Failed to generate chart title",
        details: errorMessage,
        fallback: "Chart",
      },
      { status: 500 },
    );
  }
}
