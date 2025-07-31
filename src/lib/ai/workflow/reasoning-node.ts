import { NodeKind, BaseWorkflowNodeDataData } from "./workflow.interface";
import { ReasoningPlan } from "../tools/thinking/reasoning-planner";
import { EnhancedThoughtData } from "../tools/thinking/enhanced-sequential-thinking";

/**
 * Enhanced reasoning node that can perform sophisticated multi-step thinking
 * within workflow execution. Supports hypothesis testing, branching logic,
 * and tool planning.
 */
export type ReasoningNodeData = BaseWorkflowNodeDataData<{
  kind: NodeKind.Reasoning;
}> & {
  reasoningType: "sequential" | "planning" | "hybrid";
  maxSteps: number;
  allowBranching: boolean;
  allowRevision: boolean;
  enableHypothesisTesting: boolean;
  enableToolPlanning: boolean;
  initialPrompt?: string;
  outputFormat: "thoughts" | "plan" | "summary" | "conclusions";
  timeout?: number; // milliseconds
};

/**
 * Runtime state for reasoning node execution
 */
export interface ReasoningNodeState {
  currentStep: number;
  totalSteps: number;
  thoughts: EnhancedThoughtData[];
  plan?: ReasoningPlan;
  branches: Map<string, EnhancedThoughtData[]>;
  hypotheses: Array<{
    hypothesis: string;
    evidence: string[];
    status: "testing" | "supported" | "refuted" | "inconclusive";
  }>;
  toolPlans: Array<{
    toolName: string;
    purpose: string;
    status: "planned" | "executed" | "failed";
  }>;
  status:
    | "initializing"
    | "thinking"
    | "branching"
    | "completing"
    | "completed"
    | "failed";
  startedAt: number;
  completedAt?: number;
}

/**
 * Configuration for reasoning node behavior
 */
export interface ReasoningNodeConfig {
  // Thinking configuration
  maxThoughts: number;
  thoughtTimeout: number;

  // Branching configuration
  maxBranches: number;
  branchDepth: number;

  // Hypothesis testing configuration
  maxHypotheses: number;
  evidenceThreshold: number;

  // Tool planning configuration
  maxTools: number;
  allowToolExecution: boolean;

  // Output configuration
  includeIntermediateSteps: boolean;
  includeReasoningTrace: boolean;
  compressOutput: boolean;
}

/**
 * Result from reasoning node execution
 */
export interface ReasoningNodeResult {
  thoughts: EnhancedThoughtData[];
  plan?: ReasoningPlan;
  conclusions: string[];
  toolPlans?: Array<{
    toolName: string;
    purpose: string;
    parameters?: Record<string, any>;
  }>;
  hypotheses?: Array<{
    hypothesis: string;
    status: "supported" | "refuted" | "inconclusive";
    confidence: number;
  }>;
  executionMetadata: {
    totalSteps: number;
    branchesExplored: number;
    hypothesesTested: number;
    toolsPlanned: number;
    executionTime: number;
    reasoningEfficiency: number; // 0-1 score
  };
  rawTrace?: EnhancedThoughtData[]; // Full reasoning trace for debugging
}

/**
 * Default configuration for reasoning nodes
 */
export const DEFAULT_REASONING_CONFIG: ReasoningNodeConfig = {
  maxThoughts: 20,
  thoughtTimeout: 30000,
  maxBranches: 3,
  branchDepth: 5,
  maxHypotheses: 5,
  evidenceThreshold: 2,
  maxTools: 10,
  allowToolExecution: false,
  includeIntermediateSteps: true,
  includeReasoningTrace: false,
  compressOutput: false,
};
