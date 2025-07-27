/**
 * Manual Test Script for Chart Session Isolation Fix
 *
 * This script can be run in the browser console to simulate the bug scenario
 * and verify that the fix is working correctly.
 */

console.log("🧪 Starting Chart Session Isolation Test");

// Helper function to wait for async operations
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper function to get current chart count
const getCurrentChartCount = () => {
  const chartElements = document.querySelectorAll(
    '[data-testid="chart-card"], .chart-card, [class*="chart"]',
  );
  return chartElements.length;
};

// Helper function to get active session info
const getActiveSession = () => {
  const activeTab = document.querySelector(
    '[role="tab"][aria-selected="true"], .tab-active, [class*="active"]',
  );
  return {
    tabText: activeTab?.textContent?.trim() || "Unknown",
    tabElement: activeTab,
  };
};

// Test scenario simulation
async function runChartIsolationTest() {
  console.log("📋 Test Steps:");
  console.log("1. Verify initial state");
  console.log("2. Create chart in first tab");
  console.log("3. Create second tab");
  console.log("4. Create chart in second tab");
  console.log("5. Switch back to first tab");
  console.log("6. Verify charts are isolated");

  console.log("\n🔍 Step 1: Initial State Check");
  const initialCharts = getCurrentChartCount();
  const initialSession = getActiveSession();
  console.log(`- Initial chart count: ${initialCharts}`);
  console.log(`- Active session: ${initialSession.tabText}`);

  console.log("\n📊 Step 2: Monitoring Chart Creation");
  console.log("- Please create a chart in the current tab");
  console.log("- Watch console for: [Session Debug] messages");
  console.log("- Expected: Chart should appear and be auto-saved");

  console.log("\n🔄 Step 3: Session Switching Test");
  console.log("- Please create a new tab using the '+' button");
  console.log("- Watch console for session switching logs");
  console.log("- Expected: New empty tab with no charts");

  console.log("\n📈 Step 4: Second Chart Creation");
  console.log("- Please create a different chart in the new tab");
  console.log("- Watch console for chart creation and save logs");
  console.log("- Expected: Chart appears in second tab only");

  console.log("\n🔁 Step 5: Final Isolation Test");
  console.log("- Please switch back to the first tab");
  console.log("- Expected: Original chart should still be there");
  console.log("- Expected: Second tab's chart should NOT be visible");

  console.log("\n✅ Success Indicators:");
  console.log("- Console shows proper session switching logs");
  console.log("- Charts remain in their respective tabs");
  console.log("- No chart data mixing or loss");
  console.log("- Auto-save logs appear after chart operations");

  // Monitor for debug messages
  const originalConsoleLog = console.log;
  console.log = function (...args) {
    if (args[0] && args[0].includes && args[0].includes("[Session Debug]")) {
      originalConsoleLog("🟢 SESSION DEBUG:", ...args);
    } else {
      originalConsoleLog(...args);
    }
  };

  console.log(
    "\n🎯 Debug monitoring enabled - create charts to see isolation working!",
  );
}

// Start the test
runChartIsolationTest();

// Helper function to reset console logging
window.resetConsoleLogging = () => {
  console.log = console.log.__original || console.log;
  console.log("Console logging reset");
};

// Export test utilities to window for manual use
window.chartIsolationTest = {
  getCurrentChartCount,
  getActiveSession,
  runTest: runChartIsolationTest,
  resetConsole: window.resetConsoleLogging,
};

console.log("\n💡 Available test utilities:");
console.log("- chartIsolationTest.getCurrentChartCount()");
console.log("- chartIsolationTest.getActiveSession()");
console.log("- chartIsolationTest.runTest()");
console.log("- chartIsolationTest.resetConsole()");
