import { NextRequest, NextResponse } from "next/server";
import { webPageService } from "@/lib/ai/rag/web-page-service";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url') || 'https://example.com';
  
  try {
    console.log('🧪 Test API: Attempting to extract web page content...');
    console.log('🧪 Test API: URL:', url);
    
    const result = await webPageService.extractWebPageContent(url);
    
    return NextResponse.json({
      success: true,
      result: {
        name: result.name,
        size: result.size,
        documentType: result.documentType,
        webUrl: result.webUrl,
        webTitle: result.webTitle,
        contentPreview: result.content?.substring(0, 200) + '...',
      }
    });
  } catch (error) {
    console.error('🧪 Test API: Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
