/**
 * Test script for the new LangChain-based YouTube transcript service
 */

import { YouTubeTranscriptService } from './src/lib/ai/rag/youtube-transcript.js';

async function testYouTubeTranscript() {
  console.log('🎬 Testing LangChain YouTube Transcript Service...\n');

  // Test URLs
  const testUrls = [
    'https://youtu.be/bZQun8Y4L2A', // Sample URL from LangChain docs
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Rick Roll - popular video
  ];

  for (const url of testUrls) {
    console.log(`\n📺 Testing URL: ${url}`);
    console.log('=' .repeat(50));

    try {
      // Test URL validation
      const isValid = YouTubeTranscriptService.validateYouTubeUrl(url);
      console.log(`✅ URL validation: ${isValid ? 'VALID' : 'INVALID'}`);

      if (!isValid) {
        console.log('❌ Skipping invalid URL...\n');
        continue;
      }

      // Test metadata extraction
      console.log('\n🔍 Fetching metadata...');
      const metadata = await YouTubeTranscriptService.getVideoMetadata(url);
      console.log('📋 Video Info:');
      console.log(`  - Title: ${metadata.title}`);
      console.log(`  - Channel: ${metadata.channelName}`);
      console.log(`  - Duration: ${metadata.duration} seconds`);
      console.log(`  - Video ID: ${metadata.videoId}`);
      console.log(`  - Thumbnail: ${metadata.thumbnail}`);

      // Test transcript extraction
      console.log('\n📝 Fetching transcript...');
      const result = await YouTubeTranscriptService.getVideoTranscript(url);
      
      console.log('✅ Transcript extracted successfully!');
      console.log(`📊 Transcript length: ${result.transcript.length} characters`);
      console.log(`📄 First 200 characters: ${result.transcript.substring(0, 200)}...`);
      
    } catch (error) {
      console.error(`❌ Error processing ${url}:`, error.message);
    }
  }

  console.log('\n🎉 Test completed!\n');
}

// Run the test
testYouTubeTranscript().catch(console.error);
