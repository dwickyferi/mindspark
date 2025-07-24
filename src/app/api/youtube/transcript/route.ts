import { NextRequest, NextResponse } from 'next/server';
import { YouTubeTranscriptService } from '@/lib/ai/rag/youtube-transcript';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'YouTube URL is required' },
        { status: 400 }
      );
    }

    if (!YouTubeTranscriptService.validateYouTubeUrl(url)) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    const result = await YouTubeTranscriptService.getVideoTranscript(url);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('YouTube transcript extraction error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? error.message 
          : 'Failed to extract YouTube transcript'
      },
      { status: 500 }
    );
  }
}
