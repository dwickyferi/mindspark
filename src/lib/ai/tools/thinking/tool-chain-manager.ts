import { Tool } from "ai";
import { ReasoningContext } from "./enhanced-sequential-thinking";

/**
 * Tool execution plan with dependencies and sequencing
 */
export interface ToolExecutionPlan {
  toolName: string;
  purpose: string;
  expectedOutput: string;
  dependencies?: string[];
  parameters?: Record<string, any>;
  priority?: number;
  timeout?: number;
  retryCount?: number;
}

/**
 * Tool execution result with metadata
 */
export interface ToolExecutionResult {
  toolName: string;
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
  timestamp: number;
  dependenciesMet: string[];
}

/**
 * Tool chain execution context
 */
export interface ToolChainContext {
  initialInput: any;
  currentState: Record<string, any>;
  executionHistory: ToolExecutionResult[];
  reasoningContext?: ReasoningContext;
  abortSignal?: AbortSignal;
}

/**
 * Advanced tool chain manager for sequential and parallel tool execution
 * based on reasoning plans and dependency resolution.
 */
export class ToolChainManager {
  private tools: Map<string, Tool> = new Map();
  private completed: Set<string> = new Set();
  private failed: Set<string> = new Set();
  private running: Set<string> = new Set();

  constructor(tools: Record<string, Tool>) {
    Object.entries(tools).forEach(([name, tool]) => {
      this.tools.set(name, tool);
    });
  }

  /**
   * Add tools to the chain manager
   */
  addTools(tools: Record<string, Tool>): void {
    Object.entries(tools).forEach(([name, tool]) => {
      this.tools.set(name, tool);
    });
  }

  /**
   * Plan tool execution sequence based on reasoning context
   */
  planExecution(reasoningContext: ReasoningContext): ToolExecutionPlan[] {
    const plannedTools = reasoningContext.getPlannedTools();

    // Convert reasoning plans to execution plans
    const executionPlans: ToolExecutionPlan[] = plannedTools.map(
      (plan, index) => ({
        ...plan,
        priority: plan.dependencies?.length || 0,
        timeout: 30000, // 30 second default timeout
        retryCount: 2,
      }),
    );

    // Sort by dependencies and priority
    return this.resolveDependencies(executionPlans);
  }

  /**
   * Resolve tool dependencies and create execution order
   */
  private resolveDependencies(plans: ToolExecutionPlan[]): ToolExecutionPlan[] {
    const resolved: ToolExecutionPlan[] = [];
    const remaining = [...plans];
    const processing = new Set<string>();

    while (remaining.length > 0) {
      const readyPlans = remaining.filter(
        (plan) =>
          !processing.has(plan.toolName) &&
          (plan.dependencies?.every((dep) =>
            resolved.some((r) => r.toolName === dep),
          ) ??
            true),
      );

      if (readyPlans.length === 0) {
        // Check for circular dependencies
        const deadlocked = remaining.filter(
          (plan) => !processing.has(plan.toolName),
        );
        if (deadlocked.length > 0) {
          console.warn(
            "Circular dependency detected, breaking with prioritized execution",
          );
          // Add highest priority remaining plan
          const priority = deadlocked.sort(
            (a, b) => (a.priority || 0) - (b.priority || 0),
          )[0];
          resolved.push(priority);
          remaining.splice(remaining.indexOf(priority), 1);
          continue;
        }
        break;
      }

      // Add ready plans to resolved list
      readyPlans.forEach((plan) => {
        resolved.push(plan);
        processing.add(plan.toolName);
        remaining.splice(remaining.indexOf(plan), 1);
      });
    }

    return resolved;
  }

  /**
   * Execute tool chain with sophisticated error handling and recovery
   */
  async executeChain(
    plans: ToolExecutionPlan[],
    context: ToolChainContext,
  ): Promise<ToolChainContext> {
    const startTime = Date.now();

    try {
      // Execute tools in dependency order, with parallel execution where possible
      const batches = this.createExecutionBatches(plans);

      for (const batch of batches) {
        if (context.abortSignal?.aborted) {
          throw new Error("Tool chain execution aborted");
        }

        // Execute batch in parallel
        const batchPromises = batch.map((plan) =>
          this.executeTool(plan, context),
        );
        const batchResults = await Promise.allSettled(batchPromises);

        // Process batch results
        batchResults.forEach((result, index) => {
          const plan = batch[index];

          if (result.status === "fulfilled") {
            this.completed.add(plan.toolName);
            context.executionHistory.push(result.value);

            // Update context state with tool result
            context.currentState[plan.toolName] = result.value.result;
          } else {
            this.failed.add(plan.toolName);
            const errorResult: ToolExecutionResult = {
              toolName: plan.toolName,
              success: false,
              error: result.reason?.message || "Unknown error",
              executionTime: 0,
              timestamp: Date.now(),
              dependenciesMet: plan.dependencies || [],
            };
            context.executionHistory.push(errorResult);

            // Handle critical vs non-critical failures
            if (this.isCriticalTool(plan, plans)) {
              throw new Error(
                `Critical tool failed: ${plan.toolName} - ${result.reason?.message}`,
              );
            }
          }
        });
      }

      return context;
    } catch (error) {
      console.error("Tool chain execution failed:", error);
      throw error;
    } finally {
      const totalTime = Date.now() - startTime;
      console.log(`Tool chain execution completed in ${totalTime}ms`);
    }
  }

  /**
   * Create execution batches for parallel processing
   */
  private createExecutionBatches(
    plans: ToolExecutionPlan[],
  ): ToolExecutionPlan[][] {
    const batches: ToolExecutionPlan[][] = [];
    const processed = new Set<string>();

    while (processed.size < plans.length) {
      const currentBatch = plans.filter(
        (plan) =>
          !processed.has(plan.toolName) &&
          (plan.dependencies?.every((dep) => processed.has(dep)) ?? true),
      );

      if (currentBatch.length === 0) break;

      batches.push(currentBatch);
      currentBatch.forEach((plan) => processed.add(plan.toolName));
    }

    return batches;
  }

  /**
   * Execute a single tool with retry logic and timeout handling
   */
  private async executeTool(
    plan: ToolExecutionPlan,
    context: ToolChainContext,
  ): Promise<ToolExecutionResult> {
    const tool = this.tools.get(plan.toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${plan.toolName}`);
    }

    const startTime = Date.now();
    this.running.add(plan.toolName);

    try {
      let lastError: Error | null = null;

      // Retry logic
      for (let attempt = 0; attempt <= (plan.retryCount || 0); attempt++) {
        try {
          // Prepare tool parameters from context and plan
          const toolParams = this.prepareToolParameters(plan, context);

          // Execute tool with timeout
          const toolResult = tool.execute!(toolParams, {
            toolCallId: `chain-${plan.toolName}-${Date.now()}`,
            abortSignal: context.abortSignal || new AbortController().signal,
            messages: [],
          });

          const result = await this.executeWithTimeout(
            Promise.resolve(toolResult),
            plan.timeout || 30000,
          );

          return {
            toolName: plan.toolName,
            success: true,
            result,
            executionTime: Date.now() - startTime,
            timestamp: Date.now(),
            dependenciesMet: plan.dependencies || [],
          };
        } catch (error) {
          lastError = error as Error;
          if (attempt < (plan.retryCount || 0)) {
            console.warn(
              `Tool ${plan.toolName} failed, retrying (${attempt + 1}/${plan.retryCount})`,
            );
            await this.delay(1000 * (attempt + 1)); // Exponential backoff
          }
        }
      }

      throw lastError;
    } finally {
      this.running.delete(plan.toolName);
    }
  }

  /**
   * Prepare tool parameters from execution context and dependencies
   */
  private prepareToolParameters(
    plan: ToolExecutionPlan,
    context: ToolChainContext,
  ): any {
    let params = plan.parameters || {};

    // Inject dependency results
    if (plan.dependencies) {
      plan.dependencies.forEach((depName) => {
        const depResult = context.currentState[depName];
        if (depResult) {
          params[`${depName}_result`] = depResult;
        }
      });
    }

    // Inject initial input if no specific parameters
    if (Object.keys(params).length === 0) {
      params = context.initialInput;
    }

    return params;
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeout: number,
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Tool execution timeout")), timeout);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Check if a tool is critical for the chain execution
   */
  private isCriticalTool(
    plan: ToolExecutionPlan,
    allPlans: ToolExecutionPlan[],
  ): boolean {
    // A tool is critical if other tools depend on it
    return allPlans.some((otherPlan) =>
      otherPlan.dependencies?.includes(plan.toolName),
    );
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get execution status
   */
  getExecutionStatus(): {
    completed: string[];
    failed: string[];
    running: string[];
    pending: string[];
  } {
    const allTools = new Set(this.tools.keys());
    const pending = Array.from(allTools).filter(
      (tool) =>
        !this.completed.has(tool) &&
        !this.failed.has(tool) &&
        !this.running.has(tool),
    );

    return {
      completed: Array.from(this.completed),
      failed: Array.from(this.failed),
      running: Array.from(this.running),
      pending,
    };
  }

  /**
   * Reset manager state
   */
  reset(): void {
    this.completed.clear();
    this.failed.clear();
    this.running.clear();
  }
}

/**
 * Create a tool chain manager with default tools
 */
export function createToolChainManager(
  tools: Record<string, Tool>,
): ToolChainManager {
  return new ToolChainManager(tools);
}

/**
 * Execute a reasoning-driven tool chain
 */
export async function executeReasoningToolChain(
  reasoningContext: ReasoningContext,
  availableTools: Record<string, Tool>,
  initialInput: any,
  abortSignal?: AbortSignal,
): Promise<ToolChainContext> {
  const manager = createToolChainManager(availableTools);
  const plans = manager.planExecution(reasoningContext);

  if (plans.length === 0) {
    console.log("No tools planned for execution");
    return {
      initialInput,
      currentState: {},
      executionHistory: [],
      reasoningContext,
    };
  }

  const context: ToolChainContext = {
    initialInput,
    currentState: {},
    executionHistory: [],
    reasoningContext,
    abortSignal,
  };

  return manager.executeChain(plans, context);
}
