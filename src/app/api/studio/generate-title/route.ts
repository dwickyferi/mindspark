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
  let query = "";
  let chartType = "";
  let dataKeys: string[] = [];

  try {
    const session = await getSession();

    if (!session?.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const json = await request.json();
    const parsed = GenerateTitleRequestSchema.parse(json);
    query = parsed.query;
    chartType = parsed.chartType;
    const { data, chatModel } = parsed;

    // Analyze the data structure
    dataKeys = data.length > 0 ? Object.keys(data[0]) : [];
    const dataSample = data.slice(0, 3);

    const prompt = `
      Based on the user query, data structure, and chart type, generate a comprehensive chart configuration.
      
      User Query: "${query}"
      Chart Type: ${chartType}
      Data Columns: ${dataKeys.join(", ")}
      Sample Data: ${JSON.stringify(dataSample, null, 2)}
      
      Generate a JSON configuration object with the following structure:
      {
        "title": "Chart title (concise, under 10 words)",
        "description": "Brief description of what the chart shows",
        "type": "${chartType}",
        "style": {
          "colorScheme": "default|blue|green|purple|red|orange",
          "showDataLabels": boolean,
          "enableGrid": boolean,
          "enableLegend": boolean,
          "enableTooltip": true,
          "strokeWidth": 1-4,
          "borderRadius": 0-8,
          "opacity": 0.6-1.0
        },
        "axis": {
          "xAxis": {
            "dataKey": "${dataKeys[0]}",
            "label": "X-axis label or null",
            "showAxis": true,
            "showTicks": true
          },
          "yAxis": {
            "label": "Y-axis label or null",
            "showAxis": true,
            "showTicks": true,
            "domain": ["auto", "auto"]
          }
        }
      }
      
      ${
        chartType === "line"
          ? `
      Also include:
      "curve": "linear|monotone|step",
      "showDots": boolean,
      "connectNulls": boolean
      `
          : ""
      }
      
      ${
        chartType === "bar"
          ? `
      Also include:
      "orientation": "vertical|horizontal",
      "stacked": boolean,
      "maxBarSize": number or null
      `
          : ""
      }
      
      ${
        chartType === "pie"
          ? `
      Also include:
      "innerRadius": 0-60,
      "outerRadius": 60-100,
      "startAngle": 0,
      "endAngle": 360,
      "showLabels": boolean
      `
          : ""
      }
      
      ${
        chartType === "area"
          ? `
      Also include:
      "stacked": boolean,
      "curve": "linear|monotone|step"
      `
          : ""
      }
      
      Choose appropriate settings based on the data and query context.
      Respond with ONLY the JSON configuration object, no additional text.
    `;

    // Use the same model provider as the chat system
    const model = customModelProvider.getModel(chatModel);

    const { text } = await generateText({
      model,
      system:
        "You are a data visualization expert. Generate comprehensive chart configurations in JSON format. Always respond with valid JSON only.",
      prompt,
      temperature: 0.3,
      maxTokens: 500,
    });

    try {
      const config = JSON.parse(text.trim());
      return Response.json({ config });
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      // Fallback to simple title generation
      const fallbackTitle = query || "Chart";
      return Response.json({
        config: {
          title: fallbackTitle,
          type: chartType,
          style: {
            colorScheme: "default",
            showDataLabels: false,
            enableGrid: true,
            enableLegend: true,
            enableTooltip: true,
            strokeWidth: 2,
            borderRadius: 4,
            opacity: 0.8,
          },
          axis: {
            xAxis: {
              dataKey: dataKeys[0] || "x",
              showAxis: true,
              showTicks: true,
            },
            yAxis: {
              showAxis: true,
              showTicks: true,
              domain: ["auto", "auto"],
            },
          },
        },
      });
    }
  } catch (error) {
    console.error("Error generating chart configuration:", error);

    // Return a more informative error response
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      {
        error: "Failed to generate chart configuration",
        details: errorMessage,
        config: {
          title: query || "Chart",
          type: chartType,
          style: {
            colorScheme: "default",
            showDataLabels: false,
            enableGrid: true,
            enableLegend: true,
            enableTooltip: true,
            strokeWidth: 2,
            borderRadius: 4,
            opacity: 0.8,
          },
          axis: {
            xAxis: {
              dataKey: dataKeys[0] || "x",
              showAxis: true,
              showTicks: true,
            },
            yAxis: {
              showAxis: true,
              showTicks: true,
              domain: ["auto", "auto"],
            },
          },
        },
      },
      { status: 500 },
    );
  }
}
