import { pgChatRepository } from "./pg/repositories/chat-repository.pg";
import { pgUserRepository } from "./pg/repositories/user-repository.pg";
import { pgMcpRepository } from "./pg/repositories/mcp-repository.pg";
import { pgMcpMcpToolCustomizationRepository } from "./pg/repositories/mcp-tool-customization-repository.pg";
import { pgMcpServerCustomizationRepository } from "./pg/repositories/mcp-server-customization-repository.pg";
import { pgWorkflowRepository } from "./pg/repositories/workflow-repository.pg";
import { pgRAGRepository } from "./pg/repositories/rag-repository.pg";
import { pgProjectMemberRepository } from "./pg/repositories/project-member-repository.pg";

export const chatRepository = pgChatRepository;
export const userRepository = pgUserRepository;
export const mcpRepository = pgMcpRepository;
export const mcpMcpToolCustomizationRepository =
  pgMcpMcpToolCustomizationRepository;
export const mcpServerCustomizationRepository =
  pgMcpServerCustomizationRepository;
export const workflowRepository = pgWorkflowRepository;
export const ragRepository = pgRAGRepository;
export const projectMemberRepository = pgProjectMemberRepository;
