"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import { 
  FileText, 
  Youtube, 
  Search, 
  Plus, 
  ArrowLeft,
  Upload,
  Clock,
  User,
  ExternalLink,
  Calendar,
  Filter,
  Grid3X3,
  List
} from "lucide-react";
import { Button } from "ui/button";
import { Input } from "ui/input";
import { Badge } from "ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "ui/card";
import { Checkbox } from "ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "ui/select";
import { cn } from "lib/utils";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";

import { getDocumentsAction, addDocumentAction } from "@/app/api/rag/actions";
import { selectProjectByIdAction, updateProjectAction } from "@/app/api/chat/actions";
import { Document } from "app-types/rag";
import { useDropzone } from "react-dropzone";
import { YouTubeUpload } from "@/components/youtube-upload";
import { YouTubeVideoInfo } from "app-types/rag";

type ViewMode = "grid" | "list";
type SortOption = "name" | "date" | "size" | "type";

export default function KnowledgeManagementPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  // State management
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [filterType, setFilterType] = useState<"all" | "file" | "youtube">("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUpdatingSelection, setIsUpdatingSelection] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Data fetching
  const { data: documents = [], isLoading: documentsLoading } = useSWR(
    projectId ? `documents-${projectId}` : null,
    () => projectId ? getDocumentsAction(projectId) : Promise.resolve([]),
    {
      refreshInterval: 5000,
    }
  );

  const { data: project, mutate: mutateProject } = useSWR(
    projectId ? `project-${projectId}` : null,
    () => projectId ? selectProjectByIdAction(projectId) : Promise.resolve(null)
  );

  // Initialize selected documents
  useEffect(() => {
    if (project?.selectedDocuments) {
      setSelectedDocuments(project.selectedDocuments);
    }
  }, [project?.selectedDocuments]);

  // Filter and sort documents
  const filteredAndSortedDocuments = useMemo(() => {
    let filtered = documents.filter((doc) => {
      const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.youtubeChannelName?.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = filterType === "all" || doc.documentType === filterType;
      return matchesSearch && matchesType;
    });

    // Sort documents
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "date":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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

  // Group documents by type for the Smart Tags style view
  const documentsByType = useMemo(() => {
    const fileDocuments = filteredAndSortedDocuments.filter(doc => doc.documentType === "file");
    const youtubeDocuments = filteredAndSortedDocuments.filter(doc => doc.documentType === "youtube");
    
    return {
      files: fileDocuments,
      youtube: youtubeDocuments,
    };
  }, [filteredAndSortedDocuments]);

  // Statistics
  const stats = useMemo(() => {
    const totalDocs = documents.length;
    const selectedCount = selectedDocuments.length;
    const fileCount = documents.filter(doc => doc.documentType === "file").length;
    const youtubeCount = documents.filter(doc => doc.documentType === "youtube").length;
    
    return { totalDocs, selectedCount, fileCount, youtubeCount };
  }, [documents, selectedDocuments]);

  // Handlers
  const handleUpdateSelectedDocuments = async (newSelection: string[]) => {
    if (!projectId) return;
    
    setIsUpdatingSelection(true);
    try {
      await updateProjectAction(projectId, {
        selectedDocuments: newSelection
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

  const handleToggleDocumentSelection = async (documentId: string) => {
    const isSelected = selectedDocuments.includes(documentId);
    let newSelection: string[];
    
    if (isSelected) {
      newSelection = selectedDocuments.filter(id => id !== documentId);
    } else {
      newSelection = [...selectedDocuments, documentId];
    }
    
    setSelectedDocuments(newSelection);
    await handleUpdateSelectedDocuments(newSelection);
  };

  const handleSelectAll = async () => {
    const allDocumentIds = filteredAndSortedDocuments.map(doc => doc.id);
    setSelectedDocuments(allDocumentIds);
    await handleUpdateSelectedDocuments(allDocumentIds);
  };

  const handleSelectNone = async () => {
    setSelectedDocuments([]);
    await handleUpdateSelectedDocuments([]);
  };

  // File upload handlers
  const onDrop = (acceptedFiles: File[]) => {
    setUploadFiles(prev => [...prev, ...acceptedFiles]);
  };

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

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <Link href={`/project/${projectId}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Project
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Knowledge Management</h1>
              <p className="text-sm text-muted-foreground">
                Manage and organize your project's knowledge base • {stats.selectedCount} selected
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            >
              {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
            </Button>
            
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Knowledge
                </Button>
              </DialogTrigger>
              <AddKnowledgeModal
                projectId={projectId}
                uploadFiles={uploadFiles}
                isUploading={isUploading}
                isDragActive={isDragActive}
                getRootProps={getRootProps}
                getInputProps={getInputProps}
                removeFile={removeFile}
                uploadDocuments={uploadDocuments}
                uploadYouTubeVideo={uploadYouTubeVideo}
              />
            </Dialog>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>{stats.fileCount} Files</span>
            </div>
            <div className="flex items-center gap-2">
              <Youtube className="h-4 w-4 text-red-600" />
              <span>{stats.youtubeCount} Videos</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {stats.selectedCount} Selected for Chat
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="border-b bg-card/30">
        <div className="flex items-center justify-between p-4 gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search knowledge base..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="file">Files</SelectItem>
                <SelectItem value="youtube">Videos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-32">
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

          <div className="flex items-center gap-2">
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
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {documentsLoading ? (
            <KnowledgeGridSkeleton />
          ) : filteredAndSortedDocuments.length === 0 ? (
            <EmptyState searchQuery={searchQuery} onAddClick={() => setIsAddModalOpen(true)} />
          ) : (
            <SmartTagsView
              documentsByType={documentsByType}
              selectedDocuments={selectedDocuments}
              onToggleSelection={handleToggleDocumentSelection}
              viewMode={viewMode}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Smart Tags style view component
function SmartTagsView({
  documentsByType,
  selectedDocuments,
  onToggleSelection,
  viewMode,
}: {
  documentsByType: { files: Document[]; youtube: Document[] };
  selectedDocuments: string[];
  onToggleSelection: (documentId: string) => void;
  viewMode: ViewMode;
}) {
  return (
    <div className="space-y-8">
      {/* Files Section */}
      {documentsByType.files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Files</h2>
              <p className="text-sm text-muted-foreground">
                {documentsByType.files.length} document{documentsByType.files.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <div className={cn(
            "grid gap-4",
            viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
          )}>
            {documentsByType.files.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                isSelected={selectedDocuments.includes(document.id)}
                onToggleSelection={onToggleSelection}
                viewMode={viewMode}
              />
            ))}
          </div>
        </div>
      )}

      {/* YouTube Videos Section */}
      {documentsByType.youtube.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Youtube className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">YouTube Videos</h2>
              <p className="text-sm text-muted-foreground">
                {documentsByType.youtube.length} video{documentsByType.youtube.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <div className={cn(
            "grid gap-4",
            viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
          )}>
            {documentsByType.youtube.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                isSelected={selectedDocuments.includes(document.id)}
                onToggleSelection={onToggleSelection}
                viewMode={viewMode}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Document card component
function DocumentCard({
  document,
  isSelected,
  onToggleSelection,
  viewMode,
}: {
  document: Document;
  isSelected: boolean;
  onToggleSelection: (documentId: string) => void;
  viewMode: ViewMode;
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
      year: "numeric",
    });
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

  if (viewMode === "list") {
    return (
      <Card className={cn(
        "group hover:shadow-md transition-all duration-200 cursor-pointer",
        isSelected && "ring-2 ring-primary bg-primary/5"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelection(document.id)}
              className="shrink-0"
            />
            
            {document.documentType === 'youtube' && document.youtubeThumbnail ? (
              <div className="relative w-20 h-12 rounded overflow-hidden shrink-0">
                <Image
                  src={document.youtubeThumbnail}
                  alt={document.name}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="p-3 bg-primary/10 rounded-lg shrink-0">
                {document.documentType === 'youtube' ? (
                  <Youtube className="h-6 w-6 text-red-600" />
                ) : (
                  <FileText className="h-6 w-6 text-primary" />
                )}
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <h4 className="font-medium truncate mb-1" title={document.name}>
                {document.name}
              </h4>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{formatFileSize(document.size)}</span>
                <span>{formatDate(document.createdAt)}</span>
                {document.documentType === 'youtube' && document.youtubeChannelName && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span className="truncate max-w-32">{document.youtubeChannelName}</span>
                  </div>
                )}
                {document.documentType === 'youtube' && document.youtubeDuration && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatDuration(document.youtubeDuration)}</span>
                  </div>
                )}
              </div>
            </div>
            
            {document.documentType === 'youtube' && document.youtubeUrl && (
              <a
                href={document.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shrink-0"
                title="Watch on YouTube"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grid view
  return (
    <Card className={cn(
      "group hover:shadow-md transition-all duration-200 cursor-pointer",
      isSelected && "ring-2 ring-primary bg-primary/5"
    )}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelection(document.id)}
              className="shrink-0 mt-1"
            />
            
            {document.documentType === 'youtube' && document.youtubeThumbnail ? (
              <div className="relative w-full h-24 rounded overflow-hidden">
                <Image
                  src={document.youtubeThumbnail}
                  alt={document.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                  {document.youtubeDuration && formatDuration(document.youtubeDuration)}
                </div>
              </div>
            ) : (
              <div className="w-full h-24 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText className="h-8 w-8 text-primary" />
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium text-sm line-clamp-2 leading-tight" title={document.name}>
              {document.name}
            </h4>
            
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>{formatFileSize(document.size)}</span>
                <Badge variant="outline" className="text-xs h-4">
                  {document.documentType === 'youtube' ? 'VIDEO' : 'FILE'}
                </Badge>
              </div>
              
              {document.documentType === 'youtube' && document.youtubeChannelName && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span className="truncate">{document.youtubeChannelName}</span>
                </div>
              )}
              
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(document.createdAt)}</span>
              </div>
            </div>
            
            {document.documentType === 'youtube' && document.youtubeUrl && (
              <a
                href={document.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                title="Watch on YouTube"
              >
                <ExternalLink className="h-3 w-3" />
                Watch Video
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Add Knowledge Modal
function AddKnowledgeModal({
  projectId,
  uploadFiles,
  isUploading,
  isDragActive,
  getRootProps,
  getInputProps,
  removeFile,
  uploadDocuments,
  uploadYouTubeVideo,
}: {
  projectId: string;
  uploadFiles: File[];
  isUploading: boolean;
  isDragActive: boolean;
  getRootProps: any;
  getInputProps: any;
  removeFile: (index: number) => void;
  uploadDocuments: () => void;
  uploadYouTubeVideo: (videoInfo: YouTubeVideoInfo, transcript: string) => void;
}) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add to Knowledge Base
        </DialogTitle>
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
                      ×
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
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-background border-t-transparent" />
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
  );
}

// Empty state component
function EmptyState({ searchQuery, onAddClick }: { searchQuery: string; onAddClick: () => void }) {
  if (searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Search className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No results found</h3>
        <p className="text-muted-foreground mb-4">
          No documents match your search for "{searchQuery}"
        </p>
        <p className="text-sm text-muted-foreground">
          Try adjusting your search terms or filters
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 bg-muted rounded-full mb-4">
        <FileText className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Your knowledge base is empty</h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        Add documents and YouTube videos to provide context for your AI conversations
      </p>
      <Button onClick={onAddClick}>
        <Plus className="h-4 w-4 mr-2" />
        Add Your First Knowledge
      </Button>
    </div>
  );
}

// Loading skeleton
function KnowledgeGridSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-muted rounded-lg animate-pulse" />
          <div className="space-y-2">
            <div className="w-20 h-5 bg-muted rounded animate-pulse" />
            <div className="w-32 h-4 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3">
              <div className="w-full h-24 bg-muted rounded animate-pulse" />
              <div className="space-y-2">
                <div className="w-3/4 h-4 bg-muted rounded animate-pulse" />
                <div className="w-1/2 h-3 bg-muted rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
