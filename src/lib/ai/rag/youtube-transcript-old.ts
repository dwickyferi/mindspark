import { YouTubeVideoInfo } from "@/types/rag";
import { YoutubeTranscript } from "youtube-transcript";

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
 * Fetch YouTube video information and transcript using youtube-transcript library
 */
export class YouTubeTranscriptService {
  /**
   * Get video information using YouTube's oembed API
   */
  private static async getVideoInfo(videoId: string): Promise<YouTubeVideoInfo> {
    try {
      const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      
      if (!response.ok) {
        // Fallback to basic info
        return {
          videoId,
          title: `YouTube Video ${videoId}`,
          channelName: 'Unknown Channel',
          thumbnail: getYouTubeThumbnail(videoId),
          duration: 0,
          url: `https://www.youtube.com/watch?v=${videoId}`,
        };
      }

      const data = await response.json();
      
      return {
        videoId,
        title: data.title || `YouTube Video ${videoId}`,
        channelName: data.author_name || 'Unknown Channel',
        thumbnail: data.thumbnail_url || getYouTubeThumbnail(videoId),
        duration: 0, // Duration not available in oembed
        url: `https://www.youtube.com/watch?v=${videoId}`,
      };
    } catch (error) {
      // Return basic info if API fails
      return {
        videoId,
        title: `YouTube Video ${videoId}`,
        channelName: 'Unknown Channel',
        thumbnail: getYouTubeThumbnail(videoId),
        duration: 0,
        url: `https://www.youtube.com/watch?v=${videoId}`,
      };
    }
  }

  /**
   * Extract transcript using youtube-transcript library
   */
  private static async getTranscript(videoId: string): Promise<string> {
    try {
      // Try to get transcript in English first
      const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: 'en'
      });
      return transcript.map((item) => item.text).join(' ');
    } catch (error) {
      // Try without language specification
      try {
        const transcript = await YoutubeTranscript.fetchTranscript(videoId);
        return transcript.map((item) => item.text).join(' ');
      } catch (fallbackError) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (errorMessage.includes('Transcript is disabled')) {
          throw new Error('Transcripts are disabled for this video. Please try a different video or enable captions on YouTube.');
        } else if (errorMessage.includes('No transcripts are available')) {
          throw new Error('No transcripts are available for this video. The video may not have captions or subtitles.');
        } else if (errorMessage.includes('Video unavailable')) {
          throw new Error('This video is unavailable or private. Please check the URL and try again.');
        }
        
        throw new Error(`Failed to extract transcript: ${errorMessage}`);
      }
    }
  }

  /**
   * Main method to get YouTube video info and transcript
   */
  static async getVideoTranscript(url: string): Promise<{ videoInfo: YouTubeVideoInfo; transcript: string }> {
    const videoId = extractVideoId(url);
    
    if (!videoId) {
      throw new Error('Invalid YouTube URL. Please provide a valid YouTube video URL.');
    }

    try {
      // Get video info and transcript in parallel
      const [videoInfo, transcript] = await Promise.all([
        this.getVideoInfo(videoId),
        this.getTranscript(videoId),
      ]);

      if (!transcript.trim()) {
        throw new Error('No transcript available for this video. The video may not have captions or subtitles.');
      }

      return {
        videoInfo,
        transcript: transcript.trim(),
      };
    } catch (error) {
      if (error instanceof Error) {
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
}
