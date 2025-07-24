import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const apiKey = process.env.TAVILY_API_KEY;
  
  return NextResponse.json({
    hasApiKey: !!apiKey,
    keyPreview: apiKey ? `${apiKey.substring(0, 10)}...` : "Not found",
    nodeEnv: process.env.NODE_ENV,
    allTavilyKeys: Object.keys(process.env).filter(key => key.includes('TAVILY')),
    totalEnvVars: Object.keys(process.env).length,
  });
}
