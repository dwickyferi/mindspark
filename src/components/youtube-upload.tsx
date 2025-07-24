'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Youtube, PlayCircle, Clock, User, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import { YouTubeTranscriptService, extractVideoId, getYouTubeThumbnail } from '@/lib/ai/rag/youtube-transcript';
import { YouTubeVideoInfo } from '@/types/rag';

interface YouTubePreviewProps {
  videoInfo: YouTubeVideoInfo;
  transcript: string;
  onUpload: (videoInfo: YouTubeVideoInfo, transcript: string) => void;
  onCancel: () => void;
  isUploading?: boolean;
}

function YouTubePreview({ videoInfo, transcript, onUpload, onCancel, isUploading }: YouTubePreviewProps) {
  const formatDuration = (seconds: number) => {
    if (seconds === 0) return 'Unknown duration';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const truncateTranscript = (text: string, maxLength: number = 300) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Youtube className="h-5 w-5 text-red-600" />
          <CardTitle className="text-lg">YouTube Video Preview</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Video Thumbnail and Basic Info */}
        <div className="flex gap-4">
          <div className="relative w-40 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
            <Image
              src={videoInfo.thumbnail}
              alt={videoInfo.title}
              fill
              className="object-cover"
              sizes="(max-width: 160px) 100vw, 160px"
            />
            <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
              <PlayCircle className="h-8 w-8 text-white opacity-80" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm line-clamp-2 mb-2">
              {videoInfo.title}
            </h3>
            
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span className="truncate">{videoInfo.channelName}</span>
              </div>
              
              {videoInfo.duration > 0 && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatDuration(videoInfo.duration)}</span>
                </div>
              )}
              
              <div className="flex items-center gap-1">
                <ExternalLink className="h-3 w-3" />
                <a 
                  href={videoInfo.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline truncate"
                >
                  Watch on YouTube
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Transcript Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Transcript Preview</h4>
            <Badge variant="secondary" className="text-xs">
              {transcript.split(' ').length} words
            </Badge>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-3 text-xs leading-relaxed max-h-32 overflow-y-auto">
            {truncateTranscript(transcript)}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-end gap-2">
        <Button 
          variant="outline" 
          onClick={onCancel}
          disabled={isUploading}
          size="sm"
        >
          Cancel
        </Button>
        <Button 
          onClick={() => onUpload(videoInfo, transcript)}
          disabled={isUploading}
          size="sm"
        >
          {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add to Knowledge Base
        </Button>
      </CardFooter>
    </Card>
  );
}

interface YouTubeUploadProps {
  onUpload: (videoInfo: YouTubeVideoInfo, transcript: string) => Promise<void>;
  className?: string;
}

export function YouTubeUpload({ onUpload, className }: YouTubeUploadProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ videoInfo: YouTubeVideoInfo; transcript: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    if (!YouTubeTranscriptService.validateYouTubeUrl(url)) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    setIsLoading(true);
    setError(null);
    setPreview(null);

    try {
      const response = await fetch('/api/youtube/transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process YouTube video');
      }

      const result = await response.json();
      setPreview(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process YouTube video');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (videoInfo: YouTubeVideoInfo, transcript: string) => {
    setIsUploading(true);
    setError(null);

    try {
      await onUpload(videoInfo, transcript);
      // Reset form after successful upload
      setUrl('');
      setPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload video');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setError(null);
  };

  const getVideoIdFromUrl = (url: string) => {
    return extractVideoId(url);
  };

  const getThumbnailUrl = (url: string) => {
    const videoId = getVideoIdFromUrl(url);
    return videoId ? getYouTubeThumbnail(videoId) : null;
  };

  if (preview) {
    return (
      <div className={className}>
        <YouTubePreview
          videoInfo={preview.videoInfo}
          transcript={preview.transcript}
          onUpload={handleUpload}
          onCancel={handleCancel}
          isUploading={isUploading}
        />
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-600" />
            <CardTitle className="text-lg">Add YouTube Video</CardTitle>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="youtube-url" className="text-sm font-medium">
                YouTube URL
              </label>
              <div className="relative">
                <Input
                  id="youtube-url"
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setError(null);
                  }}
                  disabled={isLoading}
                  className="pr-12"
                />
                {url && getVideoIdFromUrl(url) && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-6 h-6 rounded overflow-hidden">
                      <Image
                        src={getThumbnailUrl(url) || ''}
                        alt="Video thumbnail"
                        width={24}
                        height={24}
                        className="object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                💡 Note: Only videos with available captions/subtitles can be processed. Educational content, tech talks, and news videos typically have transcripts available.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Youtube className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm text-red-800 font-medium">
                      Unable to process video
                    </p>
                    <p className="text-xs text-red-600">
                      {error}
                    </p>
                    <p className="text-xs text-red-500">
                      Try finding a video with captions enabled, or use educational/tech content that typically has transcripts.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Button 
              type="submit" 
              disabled={isLoading || !url.trim()}
              className="w-full"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Processing Video...' : 'Preview Video'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
