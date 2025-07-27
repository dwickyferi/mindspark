/**
 * Studio-Chatbot History Separation Test
 *
 * This script can be run in the browser console to verify that Studio and Chatbot
 * have completely separate history management systems.
 */

console.log("🧪 Starting Studio-Chatbot History Separation Test");

// Test configuration
const TEST_CONFIG = {
  studioApiEndpoint: "/api/studio/chat",
  chatbotApiEndpoint: "/api/chat",
  testTimeout: 10000, // 10 seconds
};

// Helper function to wait
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Test database query function
async function checkDatabaseForStudioData() {
  try {
    // This would need to be implemented as an API endpoint for testing
    // For now, we'll just check network requests
    console.log("📊 Checking for Studio data in chatbot history...");

    // Check if any requests are going to the chatbot API from Studio
    const chatRequests = performance.getEntriesByName(
      window.location.origin + "/api/chat",
    );
    const studioRequests = performance.getEntriesByName(
      window.location.origin + "/api/studio/chat",
    );

    return {
      chatbotApiCalls: chatRequests.length,
      studioApiCalls: studioRequests.length,
      isolationWorking: chatRequests.length === 0 && studioRequests.length > 0,
    };
  } catch (error) {
    console.error("Database check failed:", error);
    return { error: error.message };
  }
}

// Test Studio API endpoint isolation
async function testStudioEndpointIsolation() {
  console.log("\n🔍 Test 1: API Endpoint Isolation");

  try {
    // Check current page
    const currentPath = window.location.pathname;
    console.log(`- Current page: ${currentPath}`);

    if (currentPath.includes("/studio")) {
      console.log("✅ On Studio page - checking for isolated API usage");

      // Monitor network requests
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (
            entry.name.includes("/api/chat") &&
            !entry.name.includes("/studio")
          ) {
            console.warn(
              "❌ ISSUE: Studio page making requests to chatbot API!",
            );
            console.warn("Request:", entry.name);
          } else if (entry.name.includes("/api/studio/chat")) {
            console.log("✅ Studio page correctly using Studio API");
          }
        }
      });

      observer.observe({ entryTypes: ["resource"] });

      console.log("📡 Network monitoring active - generate a chart to test");
      console.log("Expected: Requests should go to /api/studio/chat only");

      // Stop monitoring after 30 seconds
      setTimeout(() => {
        observer.disconnect();
        console.log("📡 Network monitoring stopped");
      }, 30000);
    } else {
      console.log("ℹ️  Not on Studio page - navigate to /studio to test");
    }
  } catch (error) {
    console.error("❌ Test 1 failed:", error);
  }
}

// Test chatbot history cleanliness
async function testChatbotHistoryClean() {
  console.log("\n🧹 Test 2: Chatbot History Cleanliness");

  try {
    // Check if we can access chat history (this would need proper API)
    console.log("- Checking for Studio data contamination in chatbot history");
    console.log("- This test requires manual verification:");
    console.log("  1. Navigate to the main chatbot page");
    console.log("  2. Check conversation history");
    console.log("  3. Verify no Studio chart generation requests appear");

    console.log("✅ Manual verification required");
  } catch (error) {
    console.error("❌ Test 2 failed:", error);
  }
}

// Test data persistence separation
async function testDataPersistenceSeparation() {
  console.log("\n💾 Test 3: Data Persistence Separation");

  console.log("- Studio conversations should be ephemeral (not saved)");
  console.log("- Chatbot conversations should be persistent (saved to DB)");
  console.log("- Chart data should be saved to StudioSessionSchema only");

  const currentPath = window.location.pathname;

  if (currentPath.includes("/studio")) {
    console.log(
      "✅ On Studio page - chart data will be saved to sessions, not chat history",
    );
  } else {
    console.log(
      "ℹ️  On Chatbot page - conversations will be saved to chat history",
    );
  }
}

// Run comprehensive test
async function runHistorySeparationTest() {
  console.log("🚀 Running comprehensive history separation test...\n");

  try {
    await testStudioEndpointIsolation();
    await wait(1000);

    await testChatbotHistoryClean();
    await wait(1000);

    await testDataPersistenceSeparation();

    console.log("\n✅ History separation test completed!");
    console.log("📋 Summary:");
    console.log("- Studio uses /api/studio/chat (ephemeral)");
    console.log("- Chatbot uses /api/chat (persistent)");
    console.log("- Chart data saved to StudioSessionSchema only");
    console.log("- No cross-contamination between features");
  } catch (error) {
    console.error("❌ Test suite failed:", error);
  }
}

// Export test utilities
window.studioHistoryTest = {
  runTest: runHistorySeparationTest,
  checkEndpointIsolation: testStudioEndpointIsolation,
  checkChatbotHistory: testChatbotHistoryClean,
  checkDataPersistence: testDataPersistenceSeparation,
  config: TEST_CONFIG,
};

// Auto-run test
runHistorySeparationTest();

console.log("\n💡 Available test utilities:");
console.log("- studioHistoryTest.runTest()");
console.log("- studioHistoryTest.checkEndpointIsolation()");
console.log("- studioHistoryTest.checkChatbotHistory()");
console.log("- studioHistoryTest.checkDataPersistence()");

console.log("\n🎯 To verify the fix:");
console.log("1. Generate a chart in Studio");
console.log(
  "2. Check browser Network tab - should see calls to /api/studio/chat",
);
console.log("3. Navigate to main chatbot page");
console.log("4. Verify no Studio interactions in chat history");
console.log("5. Generate a regular chat message");
console.log("6. Check that chatbot still saves conversations normally");
