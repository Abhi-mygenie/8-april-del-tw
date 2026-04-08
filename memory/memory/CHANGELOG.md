# Changelog

## Apr 8, 2026 — Session 3 (Dual-View System)

### Dashboard Dual-View System — COMPLETE ✅
- **Feature Flag**: Added `USE_STATUS_VIEW` to `featureFlags.js`
- **Constants**: Added `STATUS_COLUMNS` with all 9 status definitions, `fOrderStatus: 10 (reserved)`
- **State**: Added `dashboardView` ('channel' | 'status'), `hiddenChannels`, `hiddenStatuses`
- **Data Layer**: Added `statusData` memo that groups orders by fOrderStatus (1-10)
- **Filter Swap**: 
  - Channel View → 9 Status filters (YTC, Preparing, Ready, Running, Served, Pending Pay, Paid, Cancelled, Reserved)
  - Status View → 4 Channel filters (Del, Take, Dine, Room)
- **Filtering**: Filters now work within columns (status filters in channel view, channel filters in status view)
- **Hide Feature**: Hide link on column headers, linked to filter hiding across views
- **Restore**: "Show Hidden (N)" button in Header

### Header Redesign
- Removed static "All/Del/Take/Dine/Room" channel pills
- Single filter section that swaps based on dashboardView
- Layout: Filters → Search → View Toggles
- Added Channel/Status view toggle buttons (Columns icon, BarChart icon)

### Food Transfer Fix — P0 COMPLETE ✅
- Threaded `onFoodTransfer` prop through DashboardPage → ChannelColumnsLayout → ChannelColumn → OrderCard
- Food transfer icon now correctly opens transfer modal

### Documentation Updated
- ROADMAP.md: Marked items #1, #3, #6 as complete
- ARCHITECTURE.md: Added section 9.4 "Dashboard Dual-View System"
- PRD.md: Updated status, marked Dual-View features as implemented

---

## Apr 7, 2026 — Session 2 (Fork)

### Smart Default Column Calculation
- Added dynamic default maxColumns based on container width measurement
- `useEffect` measures container on mount, counts visible channels, calculates `floor(availablePerChannel / cardUnit)` per channel
- Uses `initializedForViewRef` to calculate once per viewType switch (not on every data update)
- Static fallback: table=2, order=1 (before measurement completes)

### View-Type Aware Defaults
- Table view default: 2 columns per channel
- Order view default: 1 column per channel
- Switching views resets columns to that view's default, then smart calculation overrides

### Arrow Logic Corrected (3 iterations)
- Iteration 1: Arrows transferred columns between adjacent channels (WRONG — user wanted independent)
- Iteration 2: `<` decreases self, `>` increases self, adjacent compensates (WRONG — no coupling wanted)
- Iteration 3 (FINAL): Each channel fully independent. `<` decreases (min 1), `>` increases (no max). No effect on other channels.

### localStorage Removed
- User requirement: layout resets to defaults on every login
- Switched from `useLocalStorage` to `useState`
- Added cleanup `useEffect` to remove stale `mygenie_channel_max_columns` key from browser

### Duplicate React Key Fix
- `channelData.dineIn.items` was including walk-in orders twice (from `allTablesList` + `walkInOrders.map`)
- Fixed: `allTablesList.filter(t => !t.isRoom && !t.isWalkIn)`

### Testing
- Testing agent: 12/12 tests passed (100%) for arrow functionality
- Verified: login flow, all 4 channels, arrow independence, horizontal scroll, order view, layout reset

## Apr 7, 2026 — Session 1 (Original)

### Initial Setup
- Cloned repository from GitHub (v2 branch)
- Installed dependencies with yarn
- Configured env: REACT_APP_API_BASE_URL, REACT_APP_SOCKET_URL

### Permission-Based UI
- Removed time-window/restaurant setting checks for Cancel button
- Added permission checks for `bill` and `print_icon`
- Wired Food Transfer button to navigate to OrderEntry and open modal

### Socket Workaround
- Added frontend workaround for missing `update_table` socket event on item status changes
- Table gets "engaged" lock during API fetch, released after socket event or timeout

### Channel-Based Layout — Structure Created
- Created `USE_CHANNEL_LAYOUT` feature flag
- Built `ChannelColumnsLayout.jsx`, `ChannelColumn.jsx`, `ResizeHandle.jsx`
- Added `channelData` memo in DashboardPage.jsx
- Feature-flagged rendering: old area-based vs new channel-based
