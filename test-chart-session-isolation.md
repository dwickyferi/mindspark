# Chart Session Isolation Test

## Test Scenario

This test verifies that chart data is properly isolated between tabs in the multi-session system.

### Pre-conditions

1. Studio page is loaded
2. At least one datasource is configured
3. Console is open to monitor debug logs

### Test Steps

#### Step 1: Initial Setup

1. Navigate to Studio page
2. Verify you see the default "New Sheet" tab
3. Check console for initial session loading logs

#### Step 2: Generate Chart in First Tab

1. Select a datasource in the first tab
2. Generate a chart (e.g., "Show me sales data")
3. Verify the chart appears in the first tab
4. Note the console logs showing session state being saved

#### Step 3: Create Second Tab

1. Click the "+" button to create a new tab
2. Verify the new tab is created and becomes active
3. Note that the chart from tab 1 should NOT appear in tab 2
4. Check console logs for session switching

#### Step 4: Generate Chart in Second Tab

1. In the second tab, select a datasource (can be the same or different)
2. Generate a different chart (e.g., "Show me user data")
3. Verify the chart appears in the second tab
4. Note the console logs showing chart creation and auto-save

#### Step 5: Switch Back to First Tab

1. Click on the first tab to switch back
2. **CRITICAL TEST**: Verify that the original chart from step 2 is still there
3. Verify that the chart from step 4 does NOT appear in tab 1
4. Check console logs for session loading

#### Step 6: Switch Back to Second Tab

1. Click on the second tab
2. **CRITICAL TEST**: Verify that the chart from step 4 is still there
3. Verify that the chart from step 2 does NOT appear in tab 2
4. Check console logs for session loading

### Expected Results

- ✅ Each tab maintains its own independent chart data
- ✅ Switching between tabs does not mix or overwrite chart data
- ✅ Charts are persisted correctly when switching sessions
- ✅ Console logs show proper save/load operations for each session

### Debug Information

Look for these console messages:

```
[Session Debug] Switching sessions: {from: "session1", to: "session2", currentChartCards: 1}
[Session Debug] Saving session state: {sessionId: "session1", chartCardsCount: 1, datasource: "DataSource1"}
[Session Debug] Session state saved successfully
[Session Debug] Current session state saved before switch
[Session Debug] Loading session chart cards: {sessionId: "session2", chartCardsCount: 0, hasChartCards: false}
[Session Debug] No chart cards found, cleared state
[Session Debug] New session loaded
```

### Bug Indicators (If Present)

- ❌ Charts disappear when switching tabs
- ❌ Charts from one tab appear in another tab
- ❌ Console shows incorrect chartCardsCount when loading sessions
- ❌ Session save/load operations are skipped or fail

### Fix Verification

The fix includes:

1. Proper dependency management in `switchToSession` callback
2. Auto-save functionality that saves chartCards when they change
3. Improved session switching logic with debugging
4. Correct ordering of session save before session load
