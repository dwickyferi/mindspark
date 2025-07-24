"use client";

import { useState, useMemo } from "react";
import { ChevronRight, FileText, X, Plus } from "lucide-react";
import { Button } from "ui/button";
import { Document } from "app-types/rag";
import useSWR from "swr";
import { getDocumentsAction } from "@/app/api/rag/actions";
import { selectProjectByIdAction } from "@/app/api/chat/actions";
import { cn } from "lib/utils";
import { Badge } from "ui/badge";

interface RagDocumentsSidebarProps {
  projectId?: string;
  onAddDocument?: () => void;
}

export function RagDocumentsSidebar({ projectId, onAddDocument }: RagDocumentsSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const { data: documents = [], isLoading } = useSWR(
    projectId ? `documents-${projectId}` : null,
    () => projectId ? getDocumentsAction(projectId) : Promise.resolve([]),
    {
      refreshInterval: 5000, // Refresh every 5 seconds to show new uploads
    }
  );

  const { data: project } = useSWR(
    projectId ? `project-${projectId}` : null,
    () => projectId ? selectProjectByIdAction(projectId) : Promise.resolve(null)
  );

  // Filter documents to show only selected ones
  const selectedDocuments = useMemo(() => {
    if (!project?.selectedDocuments) {
      return [];
    }
    return documents.filter(doc => 
      project.selectedDocuments!.includes(doc.id)
    );
  }, [documents, project?.selectedDocuments]);

  if (!projectId) {
    return null;
  }

  return (
    <>
      {/* Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed top-1/2 right-4 z-50 transform -translate-y-1/2 transition-all duration-200",
          "shadow-lg border bg-background/95 backdrop-blur-sm",
          isOpen && "right-80"
        )}
      >
        <FileText className="h-4 w-4 mr-1" />
        <span className="text-xs">RAG Files ({selectedDocuments.length})</span>
        <ChevronRight className={cn("h-3 w-3 ml-1 transition-transform", isOpen && "rotate-180")} />
      </Button>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-72 bg-background/95 backdrop-blur-sm border-l z-40",
          "transform transition-transform duration-300 ease-in-out",
          "shadow-xl",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <h3 className="font-semibold">RAG Documents</h3>
              <Badge variant="secondary" className="text-xs">
                {selectedDocuments.length}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {onAddDocument && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onAddDocument}
                  className="h-8 w-8 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Documents List */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : selectedDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No documents selected</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Select documents in the project settings to see them here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDocuments.map((doc) => (
                  <DocumentCard key={doc.id} document={doc} />
                ))}
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="p-4 border-t bg-muted/30">
            <p className="text-xs text-muted-foreground">
              {selectedDocuments.length > 0 
                ? `${selectedDocuments.length} selected document${selectedDocuments.length === 1 ? '' : 's'} providing context for conversations.`
                : "No documents selected for this project."
              }
            </p>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

function DocumentCard({ document }: { document: Document }) {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-start gap-2">
        <FileText className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate" title={document.name}>
            {document.name}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              {formatFileSize(document.size)}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">
              {formatDate(document.createdAt)}
            </span>
          </div>
          <div className="mt-1">
            <Badge variant="outline" className="text-xs h-5">
              {document.mimeType.split("/")[1]?.toUpperCase() || "TEXT"}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
