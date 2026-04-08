# Changelog

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
