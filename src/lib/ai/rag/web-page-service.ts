import { DocumentUpload } from "app-types/rag";

const baseURLs = {
  extract: "https://api.tavily.com/extract",
} as const;

// Ensure environment variables are loaded (Next.js runtime fix)
if (typeof window === 'undefined') { // Server-side only
  console.log('🔍 Web page service loaded - checking environment...');
  console.log('- TAVILY_API_KEY available on import:', !!process.env.TAVILY_API_KEY);
  
  try {
    const { loadEnvConfig } = require('@next/env');
    loadEnvConfig(process.cwd());
    console.log('✅ Environment config loaded');
    console.log('- TAVILY_API_KEY after loadEnvConfig:', !!process.env.TAVILY_API_KEY);
  } catch (error) {
    console.warn('⚠️  Failed to load env config:', error instanceof Error ? error.message : String(error));
  }
}

// Function to get API key dynamically
const getApiKey = (): string => {
  console.log("🔧 getApiKey() called - attempting to retrieve API key...");
  
  // Try multiple ways to get the API key
  let apiKey = process.env.TAVILY_API_KEY;
  
  console.log("🔍 Initial attempt - TAVILY_API_KEY:", !!apiKey);
  
  // FALLBACK 1: Try to reload environment if not found
  if (!apiKey && typeof window === 'undefined') {
    console.log("🔧 API key not found, attempting to reload environment...");
    try {
      const { loadEnvConfig } = require('@next/env');
      loadEnvConfig(process.cwd());
      apiKey = process.env.TAVILY_API_KEY;
      console.log('🔧 Environment reloaded, API key found:', !!apiKey);
    } catch (error) {
      console.warn('⚠️ Failed to reload environment:', error);
    }
  }
  
  // FALLBACK 2: Try reading from file directly as last resort
  if (!apiKey && typeof window === 'undefined') {
    console.log("🔧 Still no API key, trying to read from .env.local directly...");
    try {
      const fs = require('fs');
      const path = require('path');
      const envPath = path.join(process.cwd(), '.env.local');
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/TAVILY_API_KEY=(.+)/);
      if (match) {
        apiKey = match[1].trim();
        console.log('🔧 API key found from file:', !!apiKey);
      }
    } catch (error) {
      console.warn('⚠️ Failed to read from .env.local:', error);
    }
  }
  
  // Enhanced debugging
  console.log("🔍 Final Environment Debug:");
  console.log("- NODE_ENV:", process.env.NODE_ENV);
  console.log("- Process platform:", process.platform);
  console.log("- Process cwd:", process.cwd());
  console.log("- TAVILY_API_KEY exists:", !!process.env.TAVILY_API_KEY);
  console.log("- Final API key exists:", !!apiKey);
  console.log("- API key value:", apiKey ? `Found (${apiKey.substring(0, 10)}...)` : "Not found");
  console.log("- All TAVILY env vars:", Object.keys(process.env).filter(key => key.includes('TAVILY')));
  console.log("- Total env vars count:", Object.keys(process.env).length);
  
  if (!apiKey) {
    console.error("❌ TAVILY_API_KEY not found in environment variables");
    console.error("❌ Available env vars:", Object.keys(process.env).sort().slice(0, 20)); // Show first 20 for debugging
    throw new Error("TAVILY_API_KEY not configured. Please add it to your .env.local file.");
  }
  
  console.log("✅ TAVILY_API_KEY found and loaded successfully");
  return apiKey;
};

export interface TavilyExtractResponse {
  title?: string;
  content?: string;
  url?: string;
  favicon?: string;
  raw_content?: string;
  success?: boolean;
  error?: string;
}

const fetchTavilyExtract = async (url: string): Promise<TavilyExtractResponse> => {
  const API_KEY = getApiKey();

  console.log("🌐 Making Tavily API request:");
  console.log("- URL:", url);
  console.log("- API Key available:", !!API_KEY);

  const requestBody = {
    api_key: API_KEY,
    urls: [url],
    extract_depth: "basic",
    include_images: false,
    // Remove format parameter as it might not be supported by extract endpoint
    include_favicon: true,
  };

  console.log("📤 Request body:", JSON.stringify(requestBody, null, 2));

  const response = await fetch(baseURLs.extract, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  });

  console.log("📥 Tavily API response status:", response.status);
  console.log("📥 Tavily API response headers:", Object.fromEntries(response.headers.entries()));

  if (response.status === 401) {
    throw new Error("Invalid Tavily API key");
  }
  if (response.status === 429) {
    throw new Error("Tavily API usage limit exceeded");
  }

  const result = await response.json();
  console.log("📥 Tavily API response body:", JSON.stringify(result, null, 2));

  if (!response.ok) {
    throw new Error(
      `Tavily API error: ${response.status} ${response.statusText} - ${JSON.stringify(result)}`,
    );
  }

  // Tavily extract returns an array of results for each URL
  if (result.results && result.results.length > 0) {
    const extractedData = result.results[0];
    console.log("✅ Extraction successful for:", url);
    
    // Check if we have content or raw_content
    const content = extractedData.content || extractedData.raw_content;
    console.log("📝 Content available:", !!content, "Length:", content?.length || 0);
    
    return {
      title: extractedData.title,
      content: content,
      url: extractedData.url || url,
      favicon: extractedData.favicon,
      raw_content: extractedData.raw_content,
      success: !!content, // Set success based on whether we have content
    };
  } else {
    console.error("❌ No results returned from Tavily API");
    return {
      success: false,
      error: "No content could be extracted from the URL",
    };
  }
};

export class WebPageService {
  /**
   * Extract content from a web page URL using Tavily
   */
  async extractWebPageContent(url: string): Promise<DocumentUpload> {
    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      throw new Error("Please enter a valid URL");
    }

    // Only allow HTTPS URLs for security
    if (!url.startsWith("https://")) {
      throw new Error("Only HTTPS URLs are supported for security reasons");
    }

    try {
      console.log("🚀 Starting web page extraction for:", url);
      const extractedData = await fetchTavilyExtract(url);

      console.log("📊 Extraction result:", {
        success: extractedData.success,
        hasContent: !!extractedData.content,
        contentLength: extractedData.content?.length || 0,
        error: extractedData.error
      });

      if (!extractedData.success || !extractedData.content) {
        const errorMsg = extractedData.error || "Failed to extract content from the URL";
        console.error("❌ Extraction failed:", errorMsg);
        throw new Error(errorMsg);
      }

      // Validate that we got meaningful content
      if (extractedData.content.trim().length < 100) {
        console.error("❌ Content too short:", extractedData.content.trim().length, "characters");
        throw new Error("The extracted content is too short. The page might not contain substantial text content.");
      }

      // Calculate content size in bytes
      const contentBytes = new TextEncoder().encode(extractedData.content).length;

      // Check if content is too large (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (contentBytes > maxSize) {
        console.error("❌ Content too large:", contentBytes, "bytes");
        throw new Error("The extracted content is too large. Please try a different page.");
      }

      console.log("✅ Web page extraction completed successfully:", {
        title: extractedData.title,
        contentSize: contentBytes,
        url: extractedData.url
      });

      return {
        name: extractedData.title || new URL(url).hostname,
        content: extractedData.content,
        mimeType: "text/markdown",
        size: contentBytes,
        documentType: "web",
        webUrl: url,
        webTitle: extractedData.title,
        webFavicon: extractedData.favicon,
        webExtractedAt: new Date(),
      };
    } catch (error) {
      console.error("❌ Web page extraction error:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to extract content from the web page. Please check the URL and try again.");
    }
  }

  /**
   * Validate if a URL is suitable for content extraction
   */
  validateUrl(url: string): { isValid: boolean; error?: string } {
    try {
      new URL(url); // Validate URL format
      
      // Only allow HTTPS
      if (!url.startsWith("https://")) {
        return {
          isValid: false,
          error: "Only HTTPS URLs are supported for security reasons",
        };
      }

      // Block some common non-content URLs
      const blockedPatterns = [
        /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|exe|dmg)$/i,
        /^https:\/\/(www\.)?(facebook|twitter|instagram|linkedin)\.com/i,
      ];

      for (const pattern of blockedPatterns) {
        if (pattern.test(url)) {
          return {
            isValid: false,
            error: "This URL type is not supported for content extraction",
          };
        }
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: "Please enter a valid URL",
      };
    }
  }
}

export const webPageService = new WebPageService();
