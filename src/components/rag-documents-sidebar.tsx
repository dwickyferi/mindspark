"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { ChevronRight, FileText, X, Loader2, Youtube, ExternalLink, Clock, User, Plus, Upload } from "lucide-react";
import { Button } from "ui/button";
import { Document, YouTubeVideoInfo } from "app-types/rag";
import useSWR, { mutate } from "swr";
import { getDocumentsAction, addDocumentAction } from "@/app/api/rag/actions";
import { selectProjectByIdAction, updateProjectAction } from "@/app/api/chat/actions";
import { cn } from "lib/utils";
import { Badge } from "ui/badge";
import { Card, CardContent } from "ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "ui/tabs";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { toast } from "sonner";
import { YouTubeUpload } from "@/components/youtube-upload";

interface RagDocumentsSidebarProps {
  projectId?: string;
}

export function RagDocumentsSidebar({ projectId }: RagDocumentsSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [isUpdatingSelection, setIsUpdatingSelection] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  
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

  // File upload functionality
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
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const removeFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadDocuments = async () => {
    if (uploadFiles.length === 0) return;

    setIsUploading(true);
    let successCount = 0;

    for (const file of uploadFiles) {
      try {
        const content = await file.text();
        await addDocumentAction(projectId!, {
          name: file.name,
          content,
          mimeType: file.type || "text/plain",
          size: file.size,
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} document${successCount > 1 ? 's' : ''}`);
      mutate(`documents-${projectId}`);
      setUploadFiles([]);
      setIsAddModalOpen(false);
    }

    setIsUploading(false);
  };

  const uploadYouTubeVideo = async (videoInfo: YouTubeVideoInfo, transcript: string) => {
    try {
      await addDocumentAction(projectId!, {
        name: videoInfo.title,
        content: transcript,
        mimeType: "text/plain",
        size: new TextEncoder().encode(transcript).length,
        documentType: "youtube",
        youtubeVideoId: videoInfo.videoId,
        youtubeThumbnail: videoInfo.thumbnail,
        youtubeTitle: videoInfo.title,
        youtubeChannelName: videoInfo.channelName,
        youtubeDuration: videoInfo.duration,
        youtubeUrl: videoInfo.url,
      });
      toast.success(`Added YouTube video: ${videoInfo.title}`);
      mutate(`documents-${projectId}`);
      setIsAddModalOpen(false);
    } catch (error) {
      console.error("Failed to upload YouTube video:", error);
      throw new Error("Failed to add YouTube video to knowledge base");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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
                variant="outline"
                size="sm"
                onClick={() => setIsAddModalOpen(true)}
                className="text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
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

      {/* Add Document Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add to Knowledge Base
            </DialogTitle>
            <DialogDescription>
              Add documents or YouTube videos to provide context for conversations.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <Tabs defaultValue="files" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="files" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  File Upload
                </TabsTrigger>
                <TabsTrigger value="youtube" className="flex items-center gap-2">
                  <Youtube className="h-4 w-4" />
                  YouTube Video
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="files" className="space-y-4">
                {/* File Upload Section */}
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-primary/50"
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  {isDragActive ? (
                    <p>Drop the files here...</p>
                  ) : (
                    <div>
                      <p className="mb-1">Drag & drop files here, or click to select</p>
                      <p className="text-sm text-muted-foreground">
                        Supports: .txt, .md, .json, .html, .csv (max 10MB each)
                      </p>
                    </div>
                  )}
                </div>

                {/* File Queue */}
                {uploadFiles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Files to upload:</h4>
                    {uploadFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-muted rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm">{file.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {formatFileSize(file.size)}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFile(index)}
                          disabled={isUploading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      onClick={uploadDocuments}
                      disabled={isUploading}
                      className="w-full"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload {uploadFiles.length} file{uploadFiles.length > 1 ? 's' : ''}
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="youtube" className="space-y-4">
                {/* YouTube Upload Section */}
                <div className="text-center mb-4">
                  <h3 className="text-lg font-medium mb-2">Add YouTube Video</h3>
                  <p className="text-sm text-muted-foreground">
                    Add YouTube videos to your knowledge base by extracting their transcripts
                  </p>
                </div>
                <YouTubeUpload onUpload={uploadYouTubeVideo} />
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
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

  const getFileTypeLabel = (document: Document): string => {
    if (document.documentType === 'youtube') {
      return 'YouTube';
    }
    
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
    
    return typeMap[document.mimeType] || document.mimeType.split("/")[1]?.toUpperCase() || "FILE";
  };

  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return '';
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
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
            {document.documentType === 'youtube' ? (
              <div className="flex-shrink-0 w-8 h-6 rounded overflow-hidden">
                {document.youtubeThumbnail ? (
                  <Image
                    src={document.youtubeThumbnail}
                    alt={document.name}
                    width={32}
                    height={24}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="flex-shrink-0 p-1.5 bg-red-100 rounded-lg">
                    <Youtube className="h-4 w-4 text-red-600" />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-shrink-0 p-1.5 bg-primary/10 rounded-lg">
                <FileText className="h-4 w-4 text-primary" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0" onClick={handleToggleSelect}>
            <h4 className="font-medium text-sm truncate mb-1" title={document.name}>
              {document.name}
            </h4>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <span>{formatFileSize(document.size)}</span>
              <span>•</span>
              {document.documentType === 'youtube' && document.youtubeChannelName ? (
                <>
                  <User className="h-3 w-3" />
                  <span className="truncate max-w-20" title={document.youtubeChannelName}>
                    {document.youtubeChannelName}
                  </span>
                  {document.youtubeDuration && document.youtubeDuration > 0 && (
                    <>
                      <span>•</span>
                      <Clock className="h-3 w-3" />
                      <span>{formatDuration(document.youtubeDuration)}</span>
                    </>
                  )}
                </>
              ) : (
                <span>{formatDate(document.createdAt)}</span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs h-5">
                {getFileTypeLabel(document)}
              </Badge>
              {document.documentType === 'youtube' && document.youtubeUrl && (
                <a
                  href={document.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  title="Watch on YouTube"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
