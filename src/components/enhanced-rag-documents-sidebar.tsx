"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  ChevronRight,
  FileText,
  X,
  Loader2,
  Youtube,
  ExternalLink,
  Clock,
  User,
  Plus,
  Upload,
  Search,
  Settings,
  Check,
  Minus,
} from "lucide-react";
import { Button } from "ui/button";
import { Input } from "ui/input";
import { Document, YouTubeVideoInfo } from "app-types/rag";
import useSWR, { mutate } from "swr";
import { getDocumentsAction, addDocumentAction } from "@/app/api/rag/actions";
import {
  selectProjectByIdAction,
  updateProjectAction,
} from "@/app/api/chat/actions";
import { cn } from "lib/utils";
import { Badge } from "ui/badge";
import { Card, CardContent } from "ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "ui/tabs";
import { Checkbox } from "ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ui/select";
import { ScrollArea } from "ui/scroll-area";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { toast } from "sonner";
import { YouTubeUpload } from "@/components/youtube-upload";
import Link from "next/link";

interface EnhancedRagDocumentsSidebarProps {
  projectId?: string;
}

type FilterType = "all" | "file" | "youtube";
type SortType = "name" | "date" | "size" | "type";

export function EnhancedRagDocumentsSidebar({
  projectId,
}: EnhancedRagDocumentsSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [isUpdatingSelection, setIsUpdatingSelection] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);

  // Enhanced filtering and search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<SortType>("date");

  const { data: documents = [], isLoading } = useSWR(
    projectId ? `documents-${projectId}` : null,
    () => (projectId ? getDocumentsAction(projectId) : Promise.resolve([])),
    {
      refreshInterval: 5000,
    },
  );

  const { data: project, mutate: mutateProject } = useSWR(
    projectId ? `project-${projectId}` : null,
    () =>
      projectId ? selectProjectByIdAction(projectId) : Promise.resolve(null),
  );

  // Initialize selected documents from project data
  useEffect(() => {
    if (project?.selectedDocuments) {
      setSelectedDocuments(project.selectedDocuments);
    }
  }, [project?.selectedDocuments]);

  // Enhanced filtering and sorting
  const filteredAndSortedDocuments = useMemo(() => {
    const filtered = documents.filter((doc) => {
      const matchesSearch =
        searchQuery === "" ||
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.youtubeChannelName
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase());
      const matchesType =
        filterType === "all" || doc.documentType === filterType;
      return matchesSearch && matchesType;
    });

    // Sort documents
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "date":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "size":
          return b.size - a.size;
        case "type":
          return a.documentType.localeCompare(b.documentType);
        default:
          return 0;
      }
    });

    return filtered;
  }, [documents, searchQuery, filterType, sortBy]);

  // Group documents by type
  const documentsByType = useMemo(() => {
    const fileDocuments = filteredAndSortedDocuments.filter(
      (doc) => doc.documentType === "file",
    );
    const youtubeDocuments = filteredAndSortedDocuments.filter(
      (doc) => doc.documentType === "youtube",
    );

    return {
      files: fileDocuments,
      youtube: youtubeDocuments,
    };
  }, [filteredAndSortedDocuments]);

  // Selection stats
  const selectionStats = useMemo(() => {
    const totalFiltered = filteredAndSortedDocuments.length;
    const selectedInFiltered = filteredAndSortedDocuments.filter((doc) =>
      selectedDocuments.includes(doc.id),
    ).length;

    return {
      total: documents.length,
      filtered: totalFiltered,
      selected: selectedDocuments.length,
      selectedInFiltered,
      isAllFilteredSelected:
        totalFiltered > 0 && selectedInFiltered === totalFiltered,
      isSomeFilteredSelected:
        selectedInFiltered > 0 && selectedInFiltered < totalFiltered,
    };
  }, [documents, filteredAndSortedDocuments, selectedDocuments]);

  const handleUpdateSelectedDocuments = async (newSelection: string[]) => {
    if (!projectId) return;

    setIsUpdatingSelection(true);
    try {
      await updateProjectAction(projectId, {
        selectedDocuments: newSelection,
      });
      mutateProject();
      toast.success("Knowledge selection updated");
    } catch (error) {
      console.error("Failed to update selected documents:", error);
      toast.error("Failed to update knowledge selection");
      // Revert selection on error
      if (project?.selectedDocuments) {
        setSelectedDocuments(project.selectedDocuments);
      }
    } finally {
      setIsUpdatingSelection(false);
    }
  };

  const handleToggleDocumentSelection = async (
    documentId: string,
    selected: boolean,
  ) => {
    let newSelection: string[];

    if (selected) {
      newSelection = [...selectedDocuments, documentId];
    } else {
      newSelection = selectedDocuments.filter((id) => id !== documentId);
    }

    setSelectedDocuments(newSelection);
    await handleUpdateSelectedDocuments(newSelection);
  };

  const handleSelectAllFiltered = async () => {
    const filteredIds = filteredAndSortedDocuments.map((doc) => doc.id);
    const newSelection = [...new Set([...selectedDocuments, ...filteredIds])];
    setSelectedDocuments(newSelection);
    await handleUpdateSelectedDocuments(newSelection);
  };

  const handleDeselectAllFiltered = async () => {
    const filteredIds = new Set(
      filteredAndSortedDocuments.map((doc) => doc.id),
    );
    const newSelection = selectedDocuments.filter((id) => !filteredIds.has(id));
    setSelectedDocuments(newSelection);
    await handleUpdateSelectedDocuments(newSelection);
  };

  const handleSelectNone = async () => {
    setSelectedDocuments([]);
    await handleUpdateSelectedDocuments([]);
  };

  // File upload functionality
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setUploadFiles((prev) => [...prev, ...acceptedFiles]);
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
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
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
      toast.success(
        `Successfully uploaded ${successCount} document${successCount > 1 ? "s" : ""}`,
      );
      mutate(`documents-${projectId}`);
      setUploadFiles([]);
      setIsAddModalOpen(false);
    }

    setIsUploading(false);
  };

  const uploadYouTubeVideo = async (
    videoInfo: YouTubeVideoInfo,
    transcript: string,
  ) => {
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
          isOpen && "right-96",
        )}
      >
        <FileText className="h-4 w-4 mr-1" />
        <span className="text-xs">
          Knowledge ({selectionStats.selected}/{selectionStats.total})
        </span>
        <ChevronRight
          className={cn(
            "h-3 w-3 ml-1 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </Button>

      {/* Enhanced Sidebar */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-96 bg-background/95 backdrop-blur-sm border-l z-[55]",
          "transform transition-transform duration-300 ease-in-out",
          "shadow-xl",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <h3 className="font-semibold">Knowledge Selection</h3>
              <Badge variant="secondary" className="text-xs">
                {selectionStats.selected}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/project/${projectId}/knowledge`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  title="Open Knowledge Management"
                >
                  <Settings className="h-3 w-3" />
                </Button>
              </Link>
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

          {/* Search and Filters */}
          <div className="p-4 border-b bg-muted/20">
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search knowledge..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-8 text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <Select
                  value={filterType}
                  onValueChange={(value: FilterType) => setFilterType(value)}
                >
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="file">Files</SelectItem>
                    <SelectItem value="youtube">Videos</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={sortBy}
                  onValueChange={(value: SortType) => setSortBy(value)}
                >
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="size">Size</SelectItem>
                    <SelectItem value="type">Type</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Selection Controls */}
          {filteredAndSortedDocuments.length > 0 && (
            <div className="p-4 border-b bg-muted/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {selectionStats.filtered} document
                  {selectionStats.filtered !== 1 ? "s" : ""} shown
                </span>
                {isUpdatingSelection && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Updating...
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={
                    selectionStats.isAllFilteredSelected
                      ? handleDeselectAllFiltered
                      : handleSelectAllFiltered
                  }
                  disabled={isUpdatingSelection}
                  className="text-xs h-7"
                >
                  {selectionStats.isAllFilteredSelected ? (
                    <>
                      <Minus className="h-3 w-3 mr-1" />
                      Deselect Shown
                    </>
                  ) : (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Select Shown
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectNone}
                  disabled={
                    isUpdatingSelection || selectionStats.selected === 0
                  }
                  className="text-xs h-7"
                >
                  Clear All
                </Button>
              </div>
            </div>
          )}

          {/* Documents List */}
          <ScrollArea className="flex-1">
            <div className="p-4">
              {isLoading ? (
                <KnowledgeListSkeleton />
              ) : filteredAndSortedDocuments.length === 0 ? (
                <EmptyKnowledgeState
                  searchQuery={searchQuery}
                  onAddClick={() => setIsAddModalOpen(true)}
                />
              ) : (
                <EnhancedKnowledgeList
                  documentsByType={documentsByType}
                  selectedDocuments={selectedDocuments}
                  onToggleSelection={handleToggleDocumentSelection}
                />
              )}
            </div>
          </ScrollArea>

          {/* Footer Info */}
          <div className="p-4 border-t bg-muted/10">
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                <strong>{selectionStats.selected}</strong> of{" "}
                <strong>{selectionStats.total}</strong> documents selected
              </p>
              <p>
                Selected knowledge will provide context for AI conversations.
              </p>
            </div>
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
              Add documents or YouTube videos to provide context for
              conversations.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <Tabs defaultValue="files" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="files" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  File Upload
                </TabsTrigger>
                <TabsTrigger
                  value="youtube"
                  className="flex items-center gap-2"
                >
                  <Youtube className="h-4 w-4" />
                  YouTube Video
                </TabsTrigger>
              </TabsList>

              <TabsContent value="files" className="space-y-4">
                <FileUploadSection
                  uploadFiles={uploadFiles}
                  isUploading={isUploading}
                  isDragActive={isDragActive}
                  getRootProps={getRootProps}
                  getInputProps={getInputProps}
                  removeFile={removeFile}
                  uploadDocuments={uploadDocuments}
                />
              </TabsContent>

              <TabsContent value="youtube" className="space-y-4">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-medium mb-2">
                    Add YouTube Video
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Add YouTube videos to your knowledge base by extracting
                    their transcripts
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

// Enhanced Knowledge List with Smart Tags style grouping
function EnhancedKnowledgeList({
  documentsByType,
  selectedDocuments,
  onToggleSelection,
}: {
  documentsByType: { files: Document[]; youtube: Document[] };
  selectedDocuments: string[];
  onToggleSelection: (documentId: string, selected: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Files Section */}
      {documentsByType.files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
            <h4 className="font-medium text-sm">Files</h4>
            <Badge variant="outline" className="text-xs h-5">
              {documentsByType.files.length}
            </Badge>
          </div>

          <div className="space-y-2">
            {documentsByType.files.map((document) => (
              <KnowledgeCard
                key={document.id}
                document={document}
                isSelected={selectedDocuments.includes(document.id)}
                onToggleSelect={onToggleSelection}
              />
            ))}
          </div>
        </div>
      )}

      {/* YouTube Videos Section */}
      {documentsByType.youtube.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-red-100 rounded">
              <Youtube className="h-4 w-4 text-red-600" />
            </div>
            <h4 className="font-medium text-sm">YouTube Videos</h4>
            <Badge variant="outline" className="text-xs h-5">
              {documentsByType.youtube.length}
            </Badge>
          </div>

          <div className="space-y-2">
            {documentsByType.youtube.map((document) => (
              <KnowledgeCard
                key={document.id}
                document={document}
                isSelected={selectedDocuments.includes(document.id)}
                onToggleSelect={onToggleSelection}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Enhanced Knowledge Card Component
function KnowledgeCard({
  document,
  isSelected,
  onToggleSelect,
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
    });
  };

  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return "";
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, "0")}`;
  };

  const handleToggleSelect = () => {
    onToggleSelect(document.id, !isSelected);
  };

  return (
    <Card
      className={cn(
        "group hover:shadow-sm transition-all duration-200 cursor-pointer border",
        isSelected && "ring-1 ring-primary bg-primary/5 border-primary/20",
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={handleToggleSelect}
            className="mt-0.5 shrink-0"
          />

          {document.documentType === "youtube" && document.youtubeThumbnail ? (
            <div className="flex-shrink-0 w-12 h-8 rounded overflow-hidden">
              <Image
                src={document.youtubeThumbnail}
                alt={document.name}
                width={48}
                height={32}
                className="object-cover w-full h-full"
              />
            </div>
          ) : (
            <div className="flex-shrink-0 p-1.5 bg-primary/10 rounded">
              {document.documentType === "youtube" ? (
                <Youtube className="h-3.5 w-3.5 text-red-600" />
              ) : (
                <FileText className="h-3.5 w-3.5 text-primary" />
              )}
            </div>
          )}

          <div className="flex-1 min-w-0" onClick={handleToggleSelect}>
            <h4
              className="font-medium text-sm leading-tight line-clamp-2 mb-1"
              title={document.name}
            >
              {document.name}
            </h4>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatFileSize(document.size)}</span>
                <span>•</span>
                <span>{formatDate(document.createdAt)}</span>
              </div>

              {document.documentType === "youtube" && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {document.youtubeChannelName && (
                    <>
                      <User className="h-3 w-3" />
                      <span
                        className="truncate max-w-20"
                        title={document.youtubeChannelName}
                      >
                        {document.youtubeChannelName}
                      </span>
                    </>
                  )}
                  {document.youtubeDuration && document.youtubeDuration > 0 && (
                    <>
                      <span>•</span>
                      <Clock className="h-3 w-3" />
                      <span>{formatDuration(document.youtubeDuration)}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {document.documentType === "youtube" && document.youtubeUrl && (
            <a
              href={document.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-blue-600 hover:text-blue-800 transition-colors shrink-0 p-1"
              title="Watch on YouTube"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// File Upload Section Component
function FileUploadSection({
  uploadFiles,
  isUploading,
  isDragActive,
  getRootProps,
  getInputProps,
  removeFile,
  uploadDocuments,
}: {
  uploadFiles: File[];
  isUploading: boolean;
  isDragActive: boolean;
  getRootProps: any;
  getInputProps: any;
  removeFile: (index: number) => void;
  uploadDocuments: () => void;
}) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50",
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
              Supports: .txt, .md, .json, .html, .csv (max 10MB each)
            </p>
          </div>
        )}
      </div>

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
                Upload {uploadFiles.length} file
                {uploadFiles.length > 1 ? "s" : ""}
              </>
            )}
          </Button>
        </div>
      )}
    </>
  );
}

// Empty state for the sidebar
function EmptyKnowledgeState({
  searchQuery,
  onAddClick,
}: { searchQuery: string; onAddClick: () => void }) {
  if (searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Search className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground mb-4">
          No results for &quot;{searchQuery}&quot;
        </p>
        <p className="text-xs text-muted-foreground">
          Try different keywords or clear filters
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <FileText className="h-8 w-8 text-muted-foreground mb-2" />
      <p className="text-sm font-medium mb-1">No knowledge yet</p>
      <p className="text-xs text-muted-foreground mb-4">
        Add documents to provide context for conversations
      </p>
      <Button size="sm" onClick={onAddClick}>
        <Plus className="h-3 w-3 mr-1" />
        Add Knowledge
      </Button>
    </div>
  );
}

// Loading skeleton for the sidebar
function KnowledgeListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-muted rounded animate-pulse" />
          <div className="w-12 h-4 bg-muted rounded animate-pulse" />
          <div className="w-6 h-5 bg-muted rounded animate-pulse" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-3">
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 bg-muted rounded animate-pulse mt-0.5" />
                <div className="w-8 h-6 bg-muted rounded animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="w-3/4 h-4 bg-muted rounded animate-pulse" />
                  <div className="w-1/2 h-3 bg-muted rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
