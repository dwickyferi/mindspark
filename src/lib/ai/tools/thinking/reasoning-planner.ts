import { tool as createTool } from "ai";
import { z } from "zod";

/**
 * Schema for reasoning-based planning tool
 */
const reasoningPlannerSchema = z.object({
  problem: z.string().describe("The problem or task that needs to be solved"),

  approach: z
    .enum(["analytical", "experimental", "creative", "systematic", "hybrid"])
    .describe("The reasoning approach to take for solving this problem"),

  steps: z
    .array(
      z.object({
        stepNumber: z.number().describe("Step number in the sequence"),
        description: z.string().describe("What this step accomplishes"),
        reasoning: z.string().describe("Why this step is necessary"),
        expectedOutput: z
          .string()
          .describe("What output is expected from this step"),
        toolsNeeded: z
          .array(z.string())
          .optional()
          .describe("Tools that might be needed for this step"),
        dependencies: z
          .array(z.number())
          .optional()
          .describe("Step numbers this step depends on"),
        estimatedTime: z
          .string()
          .optional()
          .describe("Estimated time for this step"),
        successCriteria: z.string().describe("How to know this step succeeded"),
      }),
    )
    .describe("Sequence of steps to solve the problem"),

  alternatives: z
    .array(
      z.object({
        name: z.string().describe("Name of the alternative approach"),
        description: z.string().describe("Description of this alternative"),
        pros: z.array(z.string()).describe("Advantages of this approach"),
        cons: z.array(z.string()).describe("Disadvantages of this approach"),
        useWhen: z.string().describe("When to use this alternative"),
      }),
    )
    .optional()
    .describe("Alternative approaches to consider"),

  riskAssessment: z
    .object({
      majorRisks: z
        .array(z.string())
        .describe("Major risks that could derail the plan"),
      mitigations: z
        .array(z.string())
        .describe("How to mitigate the identified risks"),
      fallbackPlans: z
        .array(z.string())
        .describe("Backup plans if primary approach fails"),
    })
    .optional()
    .describe("Risk assessment and mitigation strategies"),

  resources: z
    .object({
      toolsRequired: z
        .array(z.string())
        .describe("Tools that will definitely be needed"),
      dataRequired: z.array(z.string()).describe("Data or information needed"),
      timeEstimate: z.string().describe("Overall time estimate for completion"),
      skillsRequired: z
        .array(z.string())
        .describe("Skills or expertise needed"),
    })
    .optional()
    .describe("Resource requirements for executing the plan"),

  successMetrics: z
    .array(z.string())
    .describe("How to measure if the overall solution is successful"),

  nextActions: z
    .array(z.string())
    .describe("Immediate next actions to start executing the plan"),
});

export type ReasoningPlan = z.infer<typeof reasoningPlannerSchema>;

export const reasoningPlannerTool = createTool({
  description: `Advanced planning tool that creates structured, reasoning-based plans for complex problems.

This tool helps with:
• **Problem Analysis**: Break down complex problems into manageable components
• **Strategic Planning**: Create step-by-step approaches with clear reasoning
• **Alternative Evaluation**: Consider multiple approaches and their trade-offs
• **Risk Management**: Identify risks and create mitigation strategies
• **Resource Planning**: Determine what tools, data, and skills are needed
• **Success Metrics**: Define how to measure progress and success

**When to use this tool:**
- Complex problems that need structured approaches
- Multi-step tasks requiring coordination of different tools
- Situations where multiple solution paths exist
- Projects that need risk assessment and planning
- Problems requiring specific expertise or resources
- Tasks where success criteria need to be clearly defined

**Key Features:**
1. **Multiple Approaches**: Choose from analytical, experimental, creative, systematic, or hybrid methods
2. **Dependency Management**: Understand which steps depend on others
3. **Alternative Planning**: Consider backup approaches and when to use them
4. **Risk Assessment**: Identify potential failures and mitigation strategies
5. **Resource Planning**: Know what you need before you start
6. **Success Metrics**: Clear criteria for measuring progress and completion

**Approaches:**
- **Analytical**: Logic-driven, step-by-step problem solving
- **Experimental**: Trial-and-error with hypothesis testing
- **Creative**: Innovative, out-of-the-box thinking
- **Systematic**: Methodical, comprehensive coverage
- **Hybrid**: Combination of multiple approaches

**Output:**
Returns a comprehensive plan with steps, alternatives, risk assessment, and resource requirements.`,

  parameters: reasoningPlannerSchema,

  execute: async (plan: ReasoningPlan) => {
    // Validate the plan structure
    const validatedPlan = await validateReasoningPlan(plan);

    // Generate execution metadata
    const metadata = {
      planId: `plan-${Date.now()}`,
      createdAt: new Date().toISOString(),
      estimatedComplexity: calculateComplexity(plan),
      criticalPath: findCriticalPath(plan.steps),
      parallelizableSteps: findParallelizableSteps(plan.steps),
      toolDependencies: extractToolDependencies(plan.steps),
    };

    return {
      ...validatedPlan,
      metadata,
      status: "planned",
      executionTips: generateExecutionTips(plan),
    };
  },
});

/**
 * Validate the reasoning plan for consistency and completeness
 */
async function validateReasoningPlan(
  plan: ReasoningPlan,
): Promise<ReasoningPlan> {
  const issues: string[] = [];

  // Check step dependencies
  plan.steps.forEach((step) => {
    if (step.dependencies) {
      step.dependencies.forEach((depStep) => {
        if (!plan.steps.some((s) => s.stepNumber === depStep)) {
          issues.push(
            `Step ${step.stepNumber} depends on non-existent step ${depStep}`,
          );
        }
        if (depStep >= step.stepNumber) {
          issues.push(
            `Step ${step.stepNumber} has circular or forward dependency on step ${depStep}`,
          );
        }
      });
    }
  });

  // Check for duplicate step numbers
  const stepNumbers = plan.steps.map((s) => s.stepNumber);
  const duplicates = stepNumbers.filter(
    (num, index) => stepNumbers.indexOf(num) !== index,
  );
  if (duplicates.length > 0) {
    issues.push(`Duplicate step numbers found: ${duplicates.join(", ")}`);
  }

  // Warn about potential issues (don't fail, just note)
  if (issues.length > 0) {
    console.warn("Plan validation issues:", issues);
  }

  return plan;
}

/**
 * Calculate plan complexity based on various factors
 */
function calculateComplexity(
  plan: ReasoningPlan,
): "low" | "medium" | "high" | "very-high" {
  let score = 0;

  // Base complexity from number of steps
  score += plan.steps.length;

  // Add complexity for dependencies
  score += plan.steps.reduce(
    (sum, step) => sum + (step.dependencies?.length || 0),
    0,
  );

  // Add complexity for tools needed
  const uniqueTools = new Set(
    plan.steps.flatMap((step) => step.toolsNeeded || []),
  );
  score += uniqueTools.size * 2;

  // Add complexity for alternatives
  score += (plan.alternatives?.length || 0) * 0.5;

  if (score <= 5) return "low";
  if (score <= 15) return "medium";
  if (score <= 30) return "high";
  return "very-high";
}

/**
 * Find the critical path through the plan steps
 */
function findCriticalPath(steps: ReasoningPlan["steps"]): number[] {
  // Simple critical path: steps that have dependents
  const hasDependents = new Set<number>();

  steps.forEach((step) => {
    step.dependencies?.forEach((dep) => {
      hasDependents.add(dep);
    });
  });

  // Start with steps that have no dependencies
  const startSteps = steps.filter((step) => !step.dependencies?.length);

  // Follow the longest path
  const criticalPath: number[] = [];
  let currentSteps = startSteps.map((s) => s.stepNumber);

  while (currentSteps.length > 0) {
    criticalPath.push(...currentSteps);

    // Find next steps that depend on current steps
    const nextSteps = steps.filter((step) =>
      step.dependencies?.some((dep) => currentSteps.includes(dep)),
    );

    currentSteps = nextSteps.map((s) => s.stepNumber);
  }

  return Array.from(new Set(criticalPath)).sort((a, b) => a - b);
}

/**
 * Find steps that can be executed in parallel
 */
function findParallelizableSteps(steps: ReasoningPlan["steps"]): number[][] {
  const parallelGroups: number[][] = [];
  const processed = new Set<number>();

  // Group steps by their dependency level
  let currentLevel = 0;
  while (processed.size < steps.length) {
    const currentGroup = steps
      .filter(
        (step) =>
          !processed.has(step.stepNumber) &&
          (step.dependencies?.every((dep) => processed.has(dep)) ?? true),
      )
      .map((step) => step.stepNumber);

    if (currentGroup.length === 0) break;

    if (currentGroup.length > 1) {
      parallelGroups.push(currentGroup);
    }

    currentGroup.forEach((stepNum) => processed.add(stepNum));
    currentLevel++;
  }

  return parallelGroups;
}

/**
 * Extract tool dependencies from the plan
 */
function extractToolDependencies(
  steps: ReasoningPlan["steps"],
): Record<string, string[]> {
  const dependencies: Record<string, string[]> = {};

  steps.forEach((step) => {
    if (step.toolsNeeded) {
      step.toolsNeeded.forEach((tool) => {
        if (!dependencies[tool]) {
          dependencies[tool] = [];
        }

        // Add tools from dependency steps
        if (step.dependencies) {
          step.dependencies.forEach((depStepNum) => {
            const depStep = steps.find((s) => s.stepNumber === depStepNum);
            if (depStep?.toolsNeeded) {
              dependencies[tool].push(...depStep.toolsNeeded);
            }
          });
        }
      });
    }
  });

  return dependencies;
}

/**
 * Generate execution tips based on the plan characteristics
 */
function generateExecutionTips(plan: ReasoningPlan): string[] {
  const tips: string[] = [];

  // Tips based on approach
  switch (plan.approach) {
    case "analytical":
      tips.push("Focus on logical reasoning and evidence-based decisions");
      tips.push("Document your reasoning at each step for review");
      break;
    case "experimental":
      tips.push("Be prepared to iterate and adjust based on results");
      tips.push("Keep track of what works and what doesn't");
      break;
    case "creative":
      tips.push("Don't be afraid to try unconventional approaches");
      tips.push("Consider multiple perspectives and ideas");
      break;
    case "systematic":
      tips.push("Follow the steps in order for best results");
      tips.push("Complete each step thoroughly before moving on");
      break;
    case "hybrid":
      tips.push("Be flexible and adapt your approach as needed");
      tips.push("Combine the best aspects of different methods");
      break;
  }

  // Tips based on complexity
  const complexity = calculateComplexity(plan);
  if (complexity === "high" || complexity === "very-high") {
    tips.push("Consider breaking this into smaller sub-problems");
    tips.push("Regular check-ins and progress reviews are recommended");
  }

  // Tips based on dependencies
  const hasComplexDependencies = plan.steps.some(
    (step) => (step.dependencies?.length || 0) > 2,
  );
  if (hasComplexDependencies) {
    tips.push("Pay careful attention to step dependencies");
    tips.push("Consider using a project management tool to track progress");
  }

  // Tips based on alternatives
  if (plan.alternatives && plan.alternatives.length > 0) {
    tips.push(
      "Keep alternative approaches in mind if the primary plan hits obstacles",
    );
    tips.push("Evaluate alternatives at key decision points");
  }

  return tips;
}
