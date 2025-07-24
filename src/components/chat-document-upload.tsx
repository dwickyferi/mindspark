"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "ui/dialog";
import { Upload, Plus, FileText, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { addDocumentAction } from "@/app/api/rag/actions";
import { updateProjectAction, selectProjectByIdAction } from "@/app/api/chat/actions";
import { cn } from "lib/utils";

interface ChatDocumentUploadProps {
  projectId?: string;
  onUploadComplete?: (documentIds: string[]) => void;
  className?: string;
  variant?: "button" | "icon";
  size?: "sm" | "default" | "lg";
}

export function ChatDocumentUpload({
  projectId,
  onUploadComplete,
  className,
  variant = "icon",
  size = "sm"
}: ChatDocumentUploadProps) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  
  // Don't render if no project
  if (!projectId) {
    return null;
  }

  const handleOpenUpload = () => {
    setIsUploadModalOpen(true);
  };

  return (
    <>
      {variant === "button" ? (
        <Button
          variant="outline"
          size={size}
          onClick={handleOpenUpload}
          className={cn("gap-2", className)}
        >
          <Plus className="h-4 w-4" />
          Add Document
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleOpenUpload}
          className={cn("h-8 w-8", className)}
          title="Add document to project"
        >
          <Plus className="h-4 w-4" />
        </Button>
      )}

      <ChatUploadModal
        isOpen={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
        projectId={projectId}
        onUploadComplete={(documentIds) => {
          setIsUploadModalOpen(false);
          onUploadComplete?.(documentIds);
        }}
      />
    </>
  );
}

interface ChatUploadModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onUploadComplete: (documentIds: string[]) => void;
}

function ChatUploadModal({
  isOpen,
  onOpenChange,
  projectId,
  onUploadComplete
}: ChatUploadModalProps) {
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
      // Upload documents
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
        
        const document = await addDocumentAction(projectId, {
          name: file.name,
          content,
          mimeType: file.type || "text/plain",
          size: file.size,
        });
        
        return document.id;
      });

      const documentIds = await Promise.all(uploadPromises);

      // Get current project to access selected documents
      const project = await selectProjectByIdAction(projectId);
      const currentSelectedDocuments = project?.selectedDocuments || [];
      
      // Add new document IDs to selected documents (avoiding duplicates)
      const newSelectedDocuments = [
        ...currentSelectedDocuments,
        ...documentIds.filter(id => !currentSelectedDocuments.includes(id))
      ];

      // Update project with new selected documents
      await updateProjectAction(projectId, {
        selectedDocuments: newSelectedDocuments
      });

      toast.success(`Uploaded ${uploadFiles.length} document(s) and added to project context`);
      setUploadFiles([]);
      onUploadComplete(documentIds);
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
            Quick Upload Documents
          </DialogTitle>
          <DialogDescription>
            Upload documents and automatically add them to your project context for AI conversations.
            <br />
            <span className="text-xs text-muted-foreground">Supported: .txt, .md, .json, .html, .csv, .pdf, .doc, .docx (max 10MB each)</span>
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
                  Files will be automatically added to your project context
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
              Upload & Add to Context {uploadFiles.length > 0 && `(${uploadFiles.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
