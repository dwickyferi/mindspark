"use client";

import { useState } from "react";
import { Button } from "ui/button";
import { Input } from "ui/input";
import { Label } from "ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "ui/card";
import { Globe, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { webPageService } from "@/lib/ai/rag/web-page-service";
import { previewWebPageAction } from "@/app/api/rag/actions";
import { Badge } from "ui/badge";

interface WebPageUploadProps {
  onUpload: (data: { url: string }) => Promise<void>;
  isUploading: boolean;
}

interface WebPagePreview {
  title: string;
  url: string;
  contentPreview: string;
  size: number;
}

export function WebPageUpload({ onUpload, isUploading }: WebPageUploadProps) {
  const [url, setUrl] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [preview, setPreview] = useState<WebPagePreview | null>(null);

    const handlePreview = async () => {
    if (!url.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    // Validate URL first (client-side validation only)
    const validation = webPageService.validateUrl(url);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    setIsExtracting(true);
    try {
      // Use server action for content extraction
      const previewData = await previewWebPageAction({ url });
      
      setPreview(previewData);
      
      toast.success("Content extracted successfully!");
    } catch (error) {
      console.error("Failed to extract content:", error);
      toast.error(error instanceof Error ? error.message : "Failed to extract content");
      setPreview(null);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleUpload = async () => {
    if (!preview) {
      toast.error("Please preview the content first");
      return;
    }

    try {
      await onUpload({ url: preview.url });
      setUrl("");
      setPreview(null);
      toast.success("Web page added successfully!");
    } catch (error) {
      console.error("Failed to add web page:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add web page");
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="webpage-url">Website URL</Label>
        <div className="flex gap-2">
          <Input
            id="webpage-url"
            type="url"
            placeholder="Enter website URL (e.g., https://example.com/article)"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setPreview(null); // Clear preview when URL changes
            }}
            disabled={isExtracting || isUploading}
          />
          <Button
            onClick={handlePreview}
            disabled={isExtracting || isUploading || !url.trim()}
            variant="outline"
          >
            {isExtracting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Globe className="size-4 mr-2" />
                Preview
              </>
            )}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Enter a website URL to extract and add its content to your knowledge base. Only HTTPS URLs are supported.
        </p>
      </div>

      {preview && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="size-4 text-blue-500" />
              {preview.title}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ExternalLink className="size-3" />
              <a
                href={preview.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline truncate"
              >
                {preview.url}
              </a>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                <Globe className="size-3 mr-1" />
                Web Page
              </Badge>
              <Badge variant="outline" className="text-xs">
                {formatFileSize(preview.size)}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Content Preview:</Label>
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {preview.contentPreview}
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="flex-1"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Adding to Knowledge Base...
                  </>
                ) : (
                  <>
                    <Globe className="size-4 mr-2" />
                    Add to Knowledge Base
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  setUrl("");
                  setPreview(null);
                }}
                variant="outline"
                disabled={isUploading}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
