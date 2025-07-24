import { webPageService } from './src/lib/ai/rag/web-page-service.js';

async function testExtraction() {
  try {
    console.log('Testing with example.com...');
    const result = await webPageService.extractWebPageContent('https://example.com');
    console.log('Success:', result);
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testExtraction();
