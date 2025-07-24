"use client";

import { useState, useMemo, useEffect } from "react";
import { ChevronRight, FileText, X, Loader2 } from "lucide-react";
import { Button } from "ui/button";
import { Document } from "app-types/rag";
import useSWR from "swr";
import { getDocumentsAction } from "@/app/api/rag/actions";
import { selectProjectByIdAction, updateProjectAction } from "@/app/api/chat/actions";
import { cn } from "lib/utils";
import { Badge } from "ui/badge";
import { Card, CardContent } from "ui/card";
import { toast } from "sonner";

interface RagDocumentsSidebarProps {
  projectId?: string;
}

export function RagDocumentsSidebar({ projectId }: RagDocumentsSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [isUpdatingSelection, setIsUpdatingSelection] = useState(false);
  
  const { data: documents = [], isLoading } = useSWR(
    projectId ? `documents-${projectId}` : null,
    () => projectId ? getDocumentsAction(projectId) : Promise.resolve([]),
    {
      refreshInterval: 5000, // Refresh every 5 seconds to show new uploads
    }
  );

  const { data: project, mutate: mutateProject } = useSWR(
    projectId ? `project-${projectId}` : null,
    () => projectId ? selectProjectByIdAction(projectId) : Promise.resolve(null)
  );

  // Initialize selected documents from project data
  useEffect(() => {
    if (project?.selectedDocuments) {
      setSelectedDocuments(project.selectedDocuments);
    }
  }, [project?.selectedDocuments]);

  // Filter documents to show only selected ones for the count
  const selectedDocumentsData = useMemo(() => {
    if (!project?.selectedDocuments) {
      return [];
    }
    return documents.filter(doc => 
      project.selectedDocuments!.includes(doc.id)
    );
  }, [documents, project?.selectedDocuments]);

  const handleUpdateSelectedDocuments = async (newSelection: string[]) => {
    if (!projectId) return;
    
    setIsUpdatingSelection(true);
    try {
      await updateProjectAction(projectId, {
        selectedDocuments: newSelection
      });
      mutateProject();
      toast.success("Document selection updated");
    } catch (error) {
      console.error("Failed to update selected documents:", error);
      toast.error("Failed to update document selection");
      // Revert selection on error
      if (project?.selectedDocuments) {
        setSelectedDocuments(project.selectedDocuments);
      }
    } finally {
      setIsUpdatingSelection(false);
    }
  };

  const handleToggleDocumentSelection = async (documentId: string, selected: boolean) => {
    let newSelection: string[];
    
    if (selected) {
      newSelection = [...selectedDocuments, documentId];
    } else {
      newSelection = selectedDocuments.filter(id => id !== documentId);
    }
    
    setSelectedDocuments(newSelection);
    await handleUpdateSelectedDocuments(newSelection);
  };

  const handleSelectAll = async () => {
    const allDocumentIds = documents.map(doc => doc.id);
    setSelectedDocuments(allDocumentIds);
    await handleUpdateSelectedDocuments(allDocumentIds);
  };

  const handleSelectNone = async () => {
    setSelectedDocuments([]);
    await handleUpdateSelectedDocuments([]);
  };

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
          "fixed top-1/2 right-4 z-[60] transform -translate-y-1/2 transition-all duration-200",
          "shadow-lg border bg-background/95 backdrop-blur-sm",
          isOpen && "right-80"
        )}
      >
        <FileText className="h-4 w-4 mr-1" />
        <span className="text-xs">RAG Files ({selectedDocumentsData.length})</span>
        <ChevronRight className={cn("h-3 w-3 ml-1 transition-transform", isOpen && "rotate-180")} />
      </Button>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-72 bg-background/95 backdrop-blur-sm border-l z-[55]",
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
              <h3 className="font-semibold">Document Selection</h3>
              <Badge variant="secondary" className="text-xs">
                {selectedDocuments.length}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Selection Controls */}
          {documents.length > 0 && (
            <div className="flex items-center gap-2 p-4 border-b bg-muted/30">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={isUpdatingSelection}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectNone}
                disabled={isUpdatingSelection}
              >
                None
              </Button>
              {isUpdatingSelection && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Updating...
                </div>
              )}
            </div>
          )}

          {/* Documents List */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No documents available</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload documents in the project knowledge base first
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <SelectableDocumentCard
                    key={doc.id}
                    document={doc}
                    isSelected={selectedDocuments.includes(doc.id)}
                    onToggleSelect={handleToggleDocumentSelection}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="p-4 border-t bg-muted/30">
            <p className="text-xs text-muted-foreground">
              {selectedDocuments.length > 0 
                ? `${selectedDocuments.length} selected document${selectedDocuments.length === 1 ? '' : 's'} will provide context for conversations.`
                : "Select documents above to provide AI context."
              }
            </p>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-[50]"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

function SelectableDocumentCard({ 
  document, 
  isSelected, 
  onToggleSelect 
}: { 
  document: Document;
  isSelected: boolean;
  onToggleSelect: (documentId: string, selected: boolean) => void;
}) {
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

  const getFileTypeLabel = (mimeType: string): string => {
    const typeMap: Record<string, string> = {
      "application/pdf": "PDF",
      "application/msword": "DOC",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
      "text/plain": "TEXT",
      "text/markdown": "MD",
      "application/json": "JSON",
      "text/html": "HTML",
      "text/csv": "CSV",
    };
    
    return typeMap[mimeType] || mimeType.split("/")[1]?.toUpperCase() || "FILE";
  };

  const handleToggleSelect = () => {
    onToggleSelect(document.id, !isSelected);
  };

  return (
    <Card className={cn(
      "group hover:shadow-md transition-all duration-200 cursor-pointer",
      isSelected && "ring-2 ring-primary bg-primary/5"
    )}>
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleToggleSelect}
              className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
            />
            <div className="flex-shrink-0 p-1.5 bg-primary/10 rounded-lg">
              <FileText className="h-4 w-4 text-primary" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0" onClick={handleToggleSelect}>
            <h4 className="font-medium text-sm truncate mb-1" title={document.name}>
              {document.name}
            </h4>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <span>{formatFileSize(document.size)}</span>
              <span>•</span>
              <span>{formatDate(document.createdAt)}</span>
            </div>
            
            <Badge variant="outline" className="text-xs h-5">
              {getFileTypeLabel(document.mimeType)}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
