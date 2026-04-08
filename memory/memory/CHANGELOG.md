# Changelog

## Apr 8, 2026 — Session 4 (Header UX — Option A Labeled Dropdowns)

### Header UX Improvement — COMPLETE ✅
- **Problem**: Too many clustered orange icons on the right side of the header. Two toggle groups (Grid/List and Columns/BarChart) looked similar and had no labels, causing confusion.
- **Solution**: Option A — Replaced icon toggles with labeled dropdown buttons:
  - `[+ Add]` — labeled add order button (was icon-only `+`)
  - `[Table ▾]` dropdown → options: "Table View", "Order View" (was Grid/List icon toggle)
  - `[Channel ▾]` / `[Status ▾]` dropdown → options: "By Channel", "By Status" (was Columns/BarChart icon toggle pair)
  - `[●]` online indicator retained
- **Behavior**: Dropdown labels dynamically reflect current selection. Only one dropdown open at a time. Closes on outside click. Checkmark on active option.
- **Files Modified**: `Header.jsx`
- **Testing**: 18/18 tests passed (100% success rate)

---

## Apr 8, 2026 — Session 3 (Dual-View System + Visibility Settings)

### Status Configuration Page — COMPLETE ✅
- **New Page**: `/visibility/status-config` — Configure which statuses are visible on dashboard
- **Sidebar**: Added "Visibility Settings" menu with "Status Configuration" sub-item
- **Features**:
  - Grid of 9 status cards with enable/disable toggle
  - Enable All / Disable All quick action buttons
  - Reset to Default button
  - Save Configuration (persists to localStorage)
  - Unsaved changes indicator with "Save Now" toast
- **Storage**: localStorage key `mygenie_enabled_statuses`
- **Effect**: Disabled statuses are hidden from both:
  - Channel View: Status filter pills
  - Status View: Status columns
- **Files Created**: `StatusConfigPage.jsx`
- **Files Modified**: `Sidebar.jsx`, `App.js`, `DashboardPage.jsx`, `Header.jsx`
- **Future**: Will be replaced by role-based permissions from backend

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
- Layout: Filters → Search → [+ Add] → [Table ▾] → [Channel ▾] → [●]
- Icon toggles replaced with labeled dropdowns in Session 4 (see above)

### Food Transfer Fix — P0 COMPLETE ✅
- Threaded `onFoodTransfer` prop through DashboardPage → ChannelColumnsLayout → ChannelColumn → OrderCard
- Food transfer icon now correctly opens transfer modal

### Documentation Updated
- ROADMAP.md: Marked items #1, #3, #6 as complete, added Status Configuration
- ARCHITECTURE.md: Added sections 9.4 "Dashboard Dual-View System" and 9.5 "Status Configuration"
- PRD.md: Updated status, marked all features as implemented
- CHANGELOG.md: This entry

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
