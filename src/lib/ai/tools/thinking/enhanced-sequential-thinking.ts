import { tool as createTool } from "ai";
import { z } from "zod";

/**
 * Enhanced schema for sophisticated sequential thinking with branching,
 * revision capabilities, and hypothesis testing.
 */
const enhancedSequentialThinkingSchema = z.object({
  thought: z
    .string()
    .describe(
      "Your current thinking step, which can include analysis, reasoning, revisions, or conclusions",
    ),

  nextThoughtNeeded: z
    .boolean()
    .describe(
      "True if you need more thinking steps, false when reasoning is complete",
    ),

  thoughtNumber: z
    .number()
    .min(1)
    .describe("Current thought number in the sequence"),

  totalThoughts: z
    .number()
    .min(1)
    .describe(
      "Current estimate of total thoughts needed (can be adjusted up/down)",
    ),

  isRevision: z
    .boolean()
    .optional()
    .describe("True if this thought revises or reconsiders previous thinking"),

  revisesThought: z
    .number()
    .optional()
    .describe(
      "If this is a revision, which thought number is being reconsidered",
    ),

  branchFromThought: z
    .number()
    .optional()
    .describe(
      "If branching to explore alternatives, which thought is the branching point",
    ),

  branchId: z
    .string()
    .optional()
    .describe(
      "Identifier for the current reasoning branch (e.g., 'alternative-approach', 'hypothesis-2')",
    ),

  needsMoreThoughts: z
    .boolean()
    .optional()
    .describe(
      "True if reaching the end but realizing more thoughts are needed",
    ),

  hypothesisGenerated: z
    .string()
    .optional()
    .describe("If generating a hypothesis, state it clearly for verification"),

  hypothesisVerification: z
    .object({
      hypothesis: z.string().describe("The hypothesis being tested"),
      evidence: z
        .array(z.string())
        .describe("Evidence supporting or refuting the hypothesis"),
      conclusion: z
        .enum(["supported", "refuted", "needs_more_data"])
        .describe("Verification result"),
    })
    .optional()
    .describe("If verifying a hypothesis, provide structured verification"),

  toolPlan: z
    .array(
      z.object({
        toolName: z.string().describe("Name of the tool to use"),
        purpose: z.string().describe("Why this tool is needed"),
        expectedOutput: z
          .string()
          .describe("What output is expected from this tool"),
        dependencies: z
          .array(z.string())
          .optional()
          .describe("Tools that must run before this one"),
      }),
    )
    .optional()
    .describe("If planning tool usage, specify the tools and their sequence"),

  contextUpdate: z
    .object({
      key: z.string().describe("Context key to update"),
      value: z.string().describe("New context value"),
      reasoning: z.string().describe("Why this context update is needed"),
    })
    .optional()
    .describe("Update reasoning context for future steps"),
});

export type EnhancedThoughtData = z.infer<
  typeof enhancedSequentialThinkingSchema
>;

/**
 * Context manager for maintaining reasoning state across thinking steps
 */
export class ReasoningContext {
  private context: Map<string, any> = new Map();
  private thoughtHistory: EnhancedThoughtData[] = [];
  private branches: Map<string, EnhancedThoughtData[]> = new Map();

  addThought(thought: EnhancedThoughtData): void {
    this.thoughtHistory.push(thought);

    // Handle branching
    if (thought.branchId) {
      if (!this.branches.has(thought.branchId)) {
        this.branches.set(thought.branchId, []);
      }
      this.branches.get(thought.branchId)!.push(thought);
    }

    // Update context if specified
    if (thought.contextUpdate) {
      this.context.set(thought.contextUpdate.key, thought.contextUpdate.value);
    }
  }

  getContext(key: string): any {
    return this.context.get(key);
  }

  getThoughtHistory(): EnhancedThoughtData[] {
    return [...this.thoughtHistory];
  }

  getBranch(branchId: string): EnhancedThoughtData[] {
    return this.branches.get(branchId) || [];
  }

  getAllBranches(): Map<string, EnhancedThoughtData[]> {
    return new Map(this.branches);
  }

  getRevisions(): EnhancedThoughtData[] {
    return this.thoughtHistory.filter((t) => t.isRevision);
  }

  getHypotheses(): Array<{ thought: EnhancedThoughtData; hypothesis: string }> {
    return this.thoughtHistory
      .filter((t) => t.hypothesisGenerated)
      .map((t) => ({ thought: t, hypothesis: t.hypothesisGenerated! }));
  }

  getVerifiedHypotheses(): Array<{
    thought: EnhancedThoughtData;
    verification: any;
  }> {
    return this.thoughtHistory
      .filter((t) => t.hypothesisVerification)
      .map((t) => ({ thought: t, verification: t.hypothesisVerification! }));
  }

  getPlannedTools(): Array<{
    toolName: string;
    purpose: string;
    expectedOutput: string;
    dependencies?: string[];
  }> {
    const allPlans = this.thoughtHistory
      .filter((t) => t.toolPlan)
      .flatMap((t) => t.toolPlan!);

    // Remove duplicates and resolve dependencies
    const uniquePlans = new Map();
    allPlans.forEach((plan) => {
      uniquePlans.set(plan.toolName, plan);
    });

    return Array.from(uniquePlans.values());
  }
}

export const enhancedSequentialThinkingTool = createTool({
  description: `Advanced sequential thinking tool for complex problem-solving with sophisticated reasoning capabilities.

This tool enables:
• **Dynamic Reasoning**: Adjust the number of thinking steps as understanding evolves
• **Thought Revision**: Reconsider and refine previous thoughts when new insights emerge
• **Branching Logic**: Explore alternative approaches simultaneously
• **Hypothesis Testing**: Generate hypotheses and systematically verify them
• **Tool Integration Planning**: Plan and sequence the use of other tools
• **Context Management**: Maintain reasoning context across multiple steps

**When to use this tool:**
- Complex problems requiring multi-step analysis
- Situations where initial assumptions might need revision
- Planning the use of multiple tools in sequence
- Problems that might have multiple valid approaches
- Hypothesis-driven problem solving
- Debugging complex issues that require systematic investigation

**Key Features:**
1. **Flexible Progression**: Can increase or decrease total thoughts as needed
2. **Revision Support**: Mark thoughts as revisions of previous steps
3. **Branch Exploration**: Create branches to explore different approaches
4. **Hypothesis Framework**: Generate and test hypotheses systematically
5. **Tool Planning**: Plan tool usage before execution
6. **Context Preservation**: Maintain state across reasoning steps

**Example Usage Patterns:**
- Start with initial analysis, then branch to explore alternatives
- Generate hypothesis, gather evidence, then verify or refute
- Plan tool sequence, execute tools, evaluate results, adjust approach
- Revise earlier thoughts when new information emerges

**Parameters:**
- \`thought\`: Current thinking step (analysis, reasoning, revision, etc.)
- \`nextThoughtNeeded\`: Whether more thinking is required
- \`thoughtNumber\`: Current position in the sequence
- \`totalThoughts\`: Estimated total (adjustable)
- \`isRevision\`: Whether this revises previous thinking
- \`revisesThought\`: Which thought is being revised
- \`branchFromThought\`: Starting point for a new branch
- \`branchId\`: Identifier for the current branch
- \`needsMoreThoughts\`: Request more steps at sequence end
- \`hypothesisGenerated\`: State a hypothesis for testing
- \`hypothesisVerification\`: Verify a hypothesis with evidence
- \`toolPlan\`: Plan tool usage sequence
- \`contextUpdate\`: Update reasoning context`,

  parameters: enhancedSequentialThinkingSchema,

  execute: async (params: EnhancedThoughtData) => {
    // The execution returns the parameters for processing by the chat system
    // The ReasoningContext would be managed at a higher level in the chat system
    return {
      thought: params.thought,
      thoughtNumber: params.thoughtNumber,
      totalThoughts: params.totalThoughts,
      nextThoughtNeeded: params.nextThoughtNeeded,
      isRevision: params.isRevision,
      revisesThought: params.revisesThought,
      branchFromThought: params.branchFromThought,
      branchId: params.branchId,
      needsMoreThoughts: params.needsMoreThoughts,
      hypothesisGenerated: params.hypothesisGenerated,
      hypothesisVerification: params.hypothesisVerification,
      toolPlan: params.toolPlan,
      contextUpdate: params.contextUpdate,
      timestamp: Date.now(),
      // Add reasoning metadata
      metadata: {
        type: "enhanced-sequential-thinking",
        hasRevision: Boolean(params.isRevision),
        hasBranching: Boolean(params.branchId),
        hasHypothesis: Boolean(params.hypothesisGenerated),
        hasVerification: Boolean(params.hypothesisVerification),
        hasToolPlan: Boolean(params.toolPlan?.length),
        hasContextUpdate: Boolean(params.contextUpdate),
      },
    };
  },
});
