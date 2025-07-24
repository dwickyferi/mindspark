"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "ui/tabs";
import { Button } from "ui/button";
import { Badge } from "ui/badge";
import {
  FileText,
  Upload,
  X,
  Loader2,
  AlertCircle,
  Trash2,
  Plus,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";
import { addDocumentAction, getDocumentsAction, deleteDocumentAction } from "@/app/api/rag/actions";
import { Document, YouTubeVideoInfo } from "app-types/rag";
import useSWR, { mutate } from "swr";
import { YouTubeUpload } from "@/components/youtube-upload";
import Image from "next/image";

interface EnhancedDocumentManagerProps {
  projectId: string;
  children: React.ReactNode;
}

export function EnhancedDocumentManager({ projectId, children }: EnhancedDocumentManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);

  const {
    data: documents = [],
    error,
    isLoading,
  } = useSWR(`/api/project/${projectId}/documents`, () =>
    getDocumentsAction(projectId)
  );

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
        await addDocumentAction(projectId, {
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
      mutate(`/api/project/${projectId}/documents`);
      setUploadFiles([]);
      setIsOpen(false);
    }

    setIsUploading(false);
  };

  const uploadYouTubeVideo = async (videoInfo: YouTubeVideoInfo, transcript: string) => {
    try {
      await addDocumentAction(projectId, {
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
      mutate(`/api/project/${projectId}/documents`);
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to upload YouTube video:", error);
      throw new Error("Failed to add YouTube video to knowledge base");
    }
  };

  const deleteDocument = async (documentId: string, documentName: string) => {
    try {
      await deleteDocumentAction(documentId);
      toast.success(`Deleted ${documentName}`);
      mutate(`/api/project/${projectId}/documents`);
    } catch (error) {
      console.error("Failed to delete document:", error);
      toast.error("Failed to delete document");
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
    <>
      <div onClick={() => setIsOpen(true)}>
        {children}
      </div>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Project Knowledge Base
            </DialogTitle>
            <DialogDescription>
              Add documents or YouTube videos that will be used to answer questions about this project.
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
              
              <TabsContent value="files" className="space-y-6">
                {/* File Upload Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Upload Documents</h3>
                  
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
                </div>
              </TabsContent>
              
              <TabsContent value="youtube" className="space-y-6">
                {/* YouTube Upload Section */}
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg font-medium mb-2">Add YouTube Video</h3>
                    <p className="text-sm text-muted-foreground">
                      Add YouTube videos to your knowledge base by extracting their transcripts
                    </p>
                  </div>
                  <YouTubeUpload onUpload={uploadYouTubeVideo} />
                </div>
              </TabsContent>
            </Tabs>

            {/* Documents List - shown on both tabs */}
            <div className="space-y-4 mt-8 pt-6 border-t">
              <h3 className="text-lg font-medium">Existing Documents</h3>
              
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : error ? (
                <div className="flex items-center gap-2 p-4 bg-destructive/10 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm">Failed to load documents</span>
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No documents uploaded yet</p>
                  <p className="text-sm">Upload documents to enable AI assistance with project context</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {documents.map((doc: Document) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {doc.documentType === 'youtube' ? (
                          <div className="flex items-center gap-2">
                            {doc.youtubeThumbnail ? (
                              <div className="flex-shrink-0 w-8 h-6 rounded overflow-hidden">
                                <Image
                                  src={doc.youtubeThumbnail}
                                  alt={doc.name}
                                  width={32}
                                  height={24}
                                  className="object-cover w-full h-full"
                                />
                              </div>
                            ) : (
                              <Youtube className="h-4 w-4 flex-shrink-0 text-red-600" />
                            )}
                          </div>
                        ) : (
                          <FileText className="h-4 w-4 flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{doc.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatFileSize(doc.size)}</span>
                            <span>•</span>
                            {doc.documentType === 'youtube' ? (
                              <>
                                <span>YouTube</span>
                                {doc.youtubeChannelName && (
                                  <>
                                    <span>•</span>
                                    <span>{doc.youtubeChannelName}</span>
                                  </>
                                )}
                              </>
                            ) : (
                              <span>{doc.mimeType}</span>
                            )}
                            <span>•</span>
                            <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${doc.name}"?`)) {
                            deleteDocument(doc.id, doc.name);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
