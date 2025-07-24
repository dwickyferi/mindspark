"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "ui/dialog";
import { Button } from "ui/button";
import { Card, CardContent } from "ui/card";
import { Badge } from "ui/badge";
import {
  FileText,
  Upload,
  X,
  Loader2,
  AlertCircle,
  Trash2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { addDocumentAction, getDocumentsAction, deleteDocumentAction } from "@/app/api/rag/actions";
import { updateProjectAction, selectProjectByIdAction } from "@/app/api/chat/actions";
import { Document } from "app-types/rag";
import useSWR from "swr";
import { cn } from "lib/utils";

interface ProjectKnowledgeSheetProps {
  projectId: string;
  children: React.ReactNode;
}

interface DocumentCardProps {
  document: Document;
  isSelected: boolean;
  onToggleSelect: (documentId: string, selected: boolean) => void;
  onDelete: (id: string, name: string) => Promise<void>;
}

function DocumentCard({ document, isSelected, onToggleSelect, onDelete }: DocumentCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(document.id, document.name);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleSelect = () => {
    onToggleSelect(document.id, !isSelected);
  };

  return (
    <Card className={cn(
      "group hover:shadow-md transition-all duration-200 cursor-pointer",
      isSelected && "ring-2 ring-primary bg-primary/5"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleToggleSelect}
              className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
            />
            <div className="flex-shrink-0 p-2 bg-primary/10 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0" onClick={handleToggleSelect}>
            <h4 className="font-medium text-sm truncate mb-1" title={document.name}>
              {document.name}
            </h4>
            
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
              <span>{formatFileSize(document.size)}</span>
              <span>•</span>
              <span>{formatDate(document.createdAt)}</span>
            </div>
            
            <Badge variant="outline" className="text-xs h-5">
              {getFileTypeLabel(document.mimeType)}
            </Badge>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            disabled={isDeleting}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function UploadModal({ 
  isOpen, 
  onOpenChange, 
  projectId, 
  onUploadComplete 
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onUploadComplete: () => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setUploadFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/plain": [".txt"],
      "text/markdown": [".md"],
      "application/json": [".json"],
      "text/html": [".html"],
      "text/csv": [".csv"],
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const removeFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = uploadFiles.map(async (file) => {
        let content: string;
        
        // Handle different file types
        if (file.type === "application/pdf" || 
            file.type === "application/msword" || 
            file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
          // For now, show a placeholder for binary files until text extraction is implemented
          content = `[${file.type.includes('pdf') ? 'PDF' : file.type.includes('word') ? 'DOC/DOCX' : 'BINARY'} File: ${file.name}]\n\nNote: Text extraction for this file type is not yet implemented. The file has been uploaded but its content cannot be processed for RAG functionality.`;
        } else {
          // For text-based files, read as text
          content = await file.text();
        }
        
        return addDocumentAction(projectId, {
          name: file.name,
          content,
          mimeType: file.type || "text/plain",
          size: file.size,
        });
      });

      await Promise.all(uploadPromises);
      toast.success(`Uploaded ${uploadFiles.length} document(s)`);
      setUploadFiles([]);
      onUploadComplete();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to upload documents:", error);
      toast.error("Failed to upload documents");
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Documents
          </DialogTitle>
          <DialogDescription>
            Upload documents to your project knowledge base. Supported formats: .txt, .md, .json, .html, .csv, .pdf, .doc, .docx (max 10MB each)
            <br />
            <span className="text-xs text-muted-foreground">Note: PDF, DOC, and DOCX files will be uploaded but text extraction is not yet implemented.</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Zone */}
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            )}
          >
            <input {...getInputProps()} />
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            {isDragActive ? (
              <p>Drop the files here...</p>
            ) : (
              <div>
                <p className="mb-1">Drag & drop files here, or click to select</p>
                <p className="text-sm text-muted-foreground">
                  Supports: .txt, .md, .json, .html, .csv, .pdf, .doc, .docx (max 10MB each)
                </p>
              </div>
            )}
          </div>

          {/* File List */}
          {uploadFiles.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Files to upload:</h4>
              {uploadFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-muted rounded"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({formatFileSize(file.size)})
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Upload Button */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploadFiles.length === 0 || isUploading}
            >
              {isUploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Upload {uploadFiles.length > 0 && `(${uploadFiles.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ProjectKnowledgeSheet({ projectId, children }: ProjectKnowledgeSheetProps) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [isUpdatingSelection, setIsUpdatingSelection] = useState(false);

  const {
    data: documents = [],
    error,
    isLoading,
    mutate: mutateDocuments,
  } = useSWR(`/api/project/${projectId}/documents`, () =>
    getDocumentsAction(projectId)
  );

  const {
    data: project,
    mutate: mutateProject
  } = useSWR(`/api/project/${projectId}`, () =>
    selectProjectByIdAction(projectId)
  );

  // Initialize selected documents from project data
  useEffect(() => {
    if (project?.selectedDocuments) {
      setSelectedDocuments(project.selectedDocuments);
    }
  }, [project?.selectedDocuments]);

  const handleDeleteDocument = async (documentId: string, documentName: string) => {
    try {
      await deleteDocumentAction(documentId);
      toast.success(`Deleted ${documentName}`);
      
      // Remove from selected documents if it was selected
      if (selectedDocuments.includes(documentId)) {
        const newSelection = selectedDocuments.filter(id => id !== documentId);
        setSelectedDocuments(newSelection);
        await handleUpdateSelectedDocuments(newSelection);
      }
      
      mutateDocuments();
    } catch (error) {
      console.error("Failed to delete document:", error);
      toast.error("Failed to delete document");
    }
  };

  const handleUploadComplete = () => {
    mutateDocuments();
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

  const handleUpdateSelectedDocuments = async (newSelection: string[]) => {
    setIsUpdatingSelection(true);
    try {
      await updateProjectAction(projectId, {
        selectedDocuments: newSelection
      });
      mutateProject();
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

  const handleSelectAll = async () => {
    const allDocumentIds = documents.map(doc => doc.id);
    setSelectedDocuments(allDocumentIds);
    await handleUpdateSelectedDocuments(allDocumentIds);
  };

  const handleSelectNone = async () => {
    setSelectedDocuments([]);
    await handleUpdateSelectedDocuments([]);
  };

  const selectedCount = selectedDocuments.length;

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>{children}</SheetTrigger>
        <SheetContent 
          side="right" 
          className="w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl p-0"
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <SheetHeader className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <SheetTitle>Knowledge Base</SheetTitle>
                  <Badge variant="secondary" className="text-xs">
                    {documents.length}
                  </Badge>
                  {selectedCount > 0 && (
                    <Badge variant="default" className="text-xs ml-2">
                      {selectedCount} selected
                    </Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsUploadModalOpen(true)}
                  className="ml-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Files
                </Button>
              </div>
              <SheetDescription>
                Select documents to provide context for your project conversations.
              </SheetDescription>
              
              {/* Selection Controls */}
              {documents.length > 0 && (
                <div className="flex items-center gap-2 pt-2">
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
                    Select None
                  </Button>
                  {isUpdatingSelection && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Updating...
                    </div>
                  )}
                </div>
              )}
            </SheetHeader>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                  <p className="text-sm text-muted-foreground">Failed to load documents</p>
                </div>
              ) : documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground mb-3" />
                  <p className="font-medium text-sm mb-1">No documents yet</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Upload documents to provide context for AI conversations
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setIsUploadModalOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add your first document
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {documents.map((document) => (
                    <DocumentCard
                      key={document.id}
                      document={document}
                      isSelected={selectedDocuments.includes(document.id)}
                      onToggleSelect={handleToggleDocumentSelection}
                      onDelete={handleDeleteDocument}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {documents.length > 0 && (
              <div className="px-6 py-4 border-t bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  {selectedCount > 0 
                    ? `${selectedCount} of ${documents.length} documents selected for AI conversations in this project.`
                    : "No documents selected. Select documents above to provide context for AI conversations."
                  }
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <UploadModal
        isOpen={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
        projectId={projectId}
        onUploadComplete={handleUploadComplete}
      />
    </>
  );
}
