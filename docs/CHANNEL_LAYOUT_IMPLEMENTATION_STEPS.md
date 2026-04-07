# Channel-Based Layout - Implementation Steps

## Overview
Step-by-step implementation with feature flag for safe rollout.

---

## Completed Steps

### Step 1: Feature Flag & Hooks ✅
- Created `USE_CHANNEL_LAYOUT = true` in `/app/frontend/src/constants/featureFlags.js`
- Created `useLocalStorage` hook (later removed from layout — kept for other potential uses)

### Step 2: ResizeHandle Component ✅ (Parked)
- Created `/app/frontend/src/components/dashboard/ResizeHandle.jsx`
- Vanilla JS mousedown/mousemove/mouseup events
- Drag events fire correctly, but UI update is broken (pixel-based model issue)
- Will rewire once flex sizing is implemented

### Step 3: ChannelColumn Component ✅
- Created `/app/frontend/src/components/dashboard/ChannelColumn.jsx`
- Header with `<` / `>` arrow buttons and channel name + count badge
- Grid rendering: `repeat(actualColumns, 160px)` for table, `repeat(actualColumns, 1fr)` for order
- Renders TableCard or OrderCard based on viewType

### Step 4: ChannelColumnsLayout Component ✅
- Created `/app/frontend/src/components/dashboard/ChannelColumnsLayout.jsx`
- `maxColumns` state per channel (useState, not localStorage)
- `getActualColumns(channelId, orderCount)` = `min(orderCount, maxColumns)`
- Independent arrow handler: `<` decreases (min 1), `>` increases (no max)
- Smart default calculation: measures container, distributes among visible channels
- View-type aware: table=2, order=1 (static fallback)
- Renders ChannelColumn + ResizeHandle between visible columns

### Step 5: Channel Data in DashboardPage ✅
- Added `channelData` useMemo grouping by channel
- dineIn: tables (non-room, non-walkIn) + walkIn orders
- takeAway/delivery: adapted orders
- room: room tables with order enrichment

### Step 6: Feature Flag Integration ✅
- `USE_CHANNEL_LAYOUT ? <ChannelColumnsLayout> : <OldLayout>`
- Old area-based code preserved behind else branch

### Step 8: Card Interactions ✅
- All handlers wired: click, markReady, markServed, bill, cancel, itemStatusChange, confirmOrder, toggleSnooze, foodTransfer
- Permissions passed through: hasPermission

---

## In Progress

### Step 6.5: Fix Sizing Model (P0)
**Status:** NEEDS IMPLEMENTATION

**Problem:** Channel containers use fixed pixel widths → grey space on right
**Solution:** Switch to flex-proportional sizing
- ChannelColumn: `flex: maxColumns` instead of `width: ${px}px`
- Grid: `repeat(auto-fill, 160px)` instead of `repeat(actualColumns, 160px)`
- Remove `flex-shrink: 0`, `minWidth` fixed values

**Files to modify:**
- `ChannelColumn.jsx` — container style
- `ChannelColumnsLayout.jsx` — remove pixel width calculations, fix enabledChannels ordering

---

## Remaining Steps

### Step 7: Remove Channel Filters from Header (P1)
**Status:** NOT STARTED
- Hide All/Del/Take/Dine/Room filter buttons when `USE_CHANNEL_LAYOUT = true`
- Keep: Search, Status filters, View toggle, Add order button
- File: `/app/frontend/src/components/layout/Header.jsx`

### Step 9: Search & Filter Integration (P1)
**Status:** PARTIALLY DONE
- `matchingIds` prop already passed to ChannelColumnsLayout
- Need to verify search works within each column
- Need to verify status filters (Confirm/Cooking/Ready/Running/Schedule) work

### Step 10: Final Testing & Cleanup (P2)
- Remove feature flag
- Remove deprecated area-based code (TableSection.jsx, old DashboardPage branches)
- Remove console.logs
- Full regression testing

---

## Known Issues

| ID | Issue | Status | Priority |
|----|-------|--------|----------|
| ISSUE-001 | Grey space (pixel width model) | OPEN | P0 |
| ISSUE-002 | enabledChannels ReferenceError | OPEN | P0 |
| BUG-001 | ResizeHandle drag non-functional | PARKED | P1 |

---

## Rollback
Set `USE_CHANNEL_LAYOUT = false` in featureFlags.js → old behavior restored immediately.
