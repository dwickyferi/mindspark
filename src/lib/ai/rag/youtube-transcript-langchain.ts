import { YouTubeVideoInfo } from "@/types/rag";
import { YoutubeLoader } from "@langchain/community/document_loaders/web/youtube";

/**
 * Extract YouTube video ID from various YouTube URL formats
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Get YouTube video thumbnail URL
 */
export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'maxres'): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}default.jpg`;
}

/**
 * YouTube Transcript Service using LangChain Community YouTube Loader
 */
export class YouTubeTranscriptService {
  /**
   * Extract transcript and video information using LangChain YoutubeLoader
   */
  static async getVideoTranscript(url: string): Promise<{ videoInfo: YouTubeVideoInfo; transcript: string }> {
    const videoId = extractVideoId(url);
    
    if (!videoId) {
      throw new Error('Invalid YouTube URL. Please provide a valid YouTube video URL.');
    }

    try {
      // Create YoutubeLoader with video info enabled
      const loader = YoutubeLoader.createFromUrl(url, {
        language: "en",
        addVideoInfo: true,
      });

      // Load the document with transcript and metadata
      const docs = await loader.load();
      
      if (!docs || docs.length === 0) {
        throw new Error('No transcript available for this video. The video may not have captions or subtitles.');
      }

      const doc = docs[0];
      const transcript = doc.pageContent;

      if (!transcript || !transcript.trim()) {
        throw new Error('No transcript available for this video. The video may not have captions or subtitles.');
      }

      // Extract metadata from the document
      const metadata = doc.metadata || {};
      
      // Create video info from metadata and fallback values
      const videoInfo: YouTubeVideoInfo = {
        videoId,
        title: metadata.title || metadata.name || `YouTube Video ${videoId}`,
        channelName: metadata.author || metadata.channel || 'Unknown Channel',
        thumbnail: metadata.thumbnail || getYouTubeThumbnail(videoId),
        duration: metadata.length || metadata.duration || 0,
        url: metadata.source || url,
      };

      return {
        videoInfo,
        transcript: transcript.trim(),
      };
    } catch (error) {
      if (error instanceof Error) {
        // Handle specific LangChain YouTube loader errors
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes('transcript is disabled') || errorMessage.includes('no transcript')) {
          throw new Error('Transcripts are disabled for this video. Please try a different video or enable captions on YouTube.');
        } else if (errorMessage.includes('video unavailable') || errorMessage.includes('private')) {
          throw new Error('This video is unavailable or private. Please check the URL and try again.');
        } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
          throw new Error('Video not found. Please check the URL and try again.');
        }
        
        throw error;
      }
      
      throw new Error('Failed to process YouTube video. Please check the URL and try again.');
    }
  }

  /**
   * Validate YouTube URL
   */
  static validateYouTubeUrl(url: string): boolean {
    return extractVideoId(url) !== null;
  }

  /**
   * Get video metadata without transcript (lighter operation)
   */
  static async getVideoMetadata(url: string): Promise<YouTubeVideoInfo> {
    const videoId = extractVideoId(url);
    
    if (!videoId) {
      throw new Error('Invalid YouTube URL. Please provide a valid YouTube video URL.');
    }

    try {
      // Use basic video info fetching
      const basicInfo: YouTubeVideoInfo = {
        videoId,
        title: `YouTube Video ${videoId}`,
        channelName: 'Unknown Channel',
        thumbnail: getYouTubeThumbnail(videoId),
        duration: 0,
        url,
      };

      // Try to get enhanced metadata using the loader but catch errors gracefully
      try {
        const loader = YoutubeLoader.createFromUrl(url, {
          language: "en",
          addVideoInfo: true,
        });

        const docs = await loader.load();
        if (docs && docs.length > 0) {
          const metadata = docs[0].metadata || {};
          
          return {
            videoId,
            title: metadata.title || metadata.name || basicInfo.title,
            channelName: metadata.author || metadata.channel || basicInfo.channelName,
            thumbnail: metadata.thumbnail || basicInfo.thumbnail,
            duration: metadata.length || metadata.duration || basicInfo.duration,
            url: metadata.source || basicInfo.url,
          };
        }
      } catch (metadataError) {
        // If metadata fetching fails, return basic info
        console.warn('Could not fetch enhanced metadata:', metadataError);
      }

      return basicInfo;
    } catch (error) {
      throw new Error('Failed to get video metadata. Please check the URL and try again.');
    }
  }
}
