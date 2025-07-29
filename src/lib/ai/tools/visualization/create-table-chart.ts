import { tool as createTool } from "ai";
import { z } from "zod";

export const createTableChartTool = createTool({
  description: "Create a data table to display raw tabular data",
  parameters: z.object({
    data: z
      .array(z.record(z.any()))
      .describe("Raw data array with objects containing key-value pairs"),
    title: z.string(),
    description: z.string().optional(),
    maxRows: z
      .number()
      .optional()
      .describe("Maximum number of rows to display (defaults to 100)"),
  }),
  execute: async () => {
    return "Success";
  },
});
