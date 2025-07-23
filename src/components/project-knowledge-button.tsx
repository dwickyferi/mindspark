import { ProjectKnowledgeSheet } from "@/components/project-knowledge-sheet";
import { Button } from "ui/button";
import { FileText } from "lucide-react";

interface ProjectKnowledgeButtonProps {
  projectId: string;
}

export function ProjectKnowledgeButton({ projectId }: ProjectKnowledgeButtonProps) {
  return (
    <ProjectKnowledgeSheet projectId={projectId}>
      <Button variant="outline" size="sm">
        <FileText className="h-4 w-4 mr-2" />
        Knowledge Base
      </Button>
    </ProjectKnowledgeSheet>
  );
}
