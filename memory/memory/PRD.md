# MyGenie Restaurant POS System - PRD

## Original Problem Statement
Pull code from https://github.com/Abhi-mygenie/8-april-del-tw.git default branch (v2). Run and build as-is React app (no backend). Add env variables for API and Socket URLs.

**Emergent Product Requirement:** Redesign the Dashboard layout from an "Area-based" grouping (Default, In, Out) to a "Channel-based" dynamic column layout (Dine-in, Takeaway, Delivery, Room). Columns must be resizable via arrows, and dynamically adapt to available screen width.

## Tech Stack
- React 19 with CRACO
- Tailwind CSS
- Radix UI components
- Socket.io client
- React Router DOM

## Environment Configuration
Frontend .env:
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online

## User Personas
- Restaurant Owner/Manager: Uses the POS dashboard to monitor all order channels simultaneously

## Core Requirements
1. Channel-based columns: Dine-In, TakeAway, Delivery, Room — each rendered as independent columns
2. Arrow buttons `<` / `>` on each channel header to decrease/increase column count independently
3. No max limit on column increase; min is 1 column (if channel has orders)
4. Channels with 0 orders auto-hide (0 columns)
5. Smart defaults: on login, columns fill available screen width based on how many channels are visible
6. Default columns differ by view: table view = 2, order view = 1 (static fallback)
7. Layout state resets on every login/page mount (no localStorage persistence)
8. Horizontal scroll when user manually expands beyond viewport via arrows
9. Permissions-based UI: Cancel, Bill, Print strictly from AuthContext permissions array

## Key Architectural Decisions
- **Permissions:** UI is a "dumb" display layer. No frontend logic for time windows or restaurant settings.
- **Channel columns:** `maxColumns` controlled per-channel via `useState` (not localStorage). `actualColumns = min(orderCount, maxColumns)`.
- **Feature flag:** `USE_CHANNEL_LAYOUT = true` in `/app/frontend/src/constants/featureFlags.js` for safe rollout.
- **Smart defaults:** On mount, measure container width, count visible channels, calculate `floor(availablePerChannel / cardUnit)` as default maxColumns.

## Current Status (Apr 8, 2026)

### What's Working
- Phase A (Arrow Functionality) — arrows work independently per channel, tested 100% pass rate
- Smart default calculation — measures container, distributes width among visible channels
- View-type aware defaults — table view starts at 2 cols, order view at 1 col (static fallback)
- Feature flag toggle between old area-based and new channel-based layout
- **Dashboard Dual-View System — FULLY IMPLEMENTED:**
  - Toggle between "By Channel" and "By Status" views
  - Filter swap: Channel View → 9 Status filters, Status View → 4 Channel filters
  - Hide column → Also hides corresponding filter (linked across views)
  - Restore hidden button in Header
  - All 9 status filters working (YTC, Preparing, Ready, Running, Served, Pending Pay, Paid, Cancelled, Reserved)
- **Food Transfer — FIXED:** onFoodTransfer prop now threaded through entire component chain

### Known Issues (Active)
1. **`enabledChannels` ReferenceError** — intermittent crash "Cannot access 'enabledChannels' before initialization". Root cause: useEffect ordering or cached JS bundle.
2. **Item-level spinner missing** — Ready/Serve buttons don't show loading state during API call

### What's Parked
- Phase B: Drag-to-Resize via ResizeHandle (non-functional, parked)

## Backlog (P0 → P2)

### P0 (Critical)
- Add `setTableEngaged` to `handleItemStatusChange` (item-level spinner)

### P1 (Important)
- Fix `handleTableClick` type mismatch (String vs Number comparison)
- Remove BUG-216 free→engage workaround
- Phase B: Drag-to-Resize via ResizeHandle between channels

### P2 (Future)
- Wire `onMergeOrder`/`onTableShift` in Channel Layout
- Clean up deprecated area-based components (TableSection.jsx) after full approval
- Implement `clear_payment` functionality
- Implement `serve` button functionality (API integration)
- Fix backend table socket bug (frontend workaround in place)

## File References
- `/app/frontend/src/components/dashboard/ChannelColumnsLayout.jsx` — main container, arrow logic, smart defaults
- `/app/frontend/src/components/dashboard/ChannelColumn.jsx` — individual channel column, arrow buttons, grid rendering
- `/app/frontend/src/components/dashboard/ResizeHandle.jsx` — drag handle (Phase B, non-functional)
- `/app/frontend/src/constants/featureFlags.js` — `USE_CHANNEL_LAYOUT` flag
- `/app/frontend/src/pages/DashboardPage.jsx` — orchestrator, channelData memo, handlers
- `/app/frontend/src/components/cards/OrderCard.jsx` — permission-based actions
- `/app/frontend/src/api/socket/socketHandlers.js` — table lock workaround
- `/app/frontend/src/api/constants.js` — `F_ORDER_STATUS` mapping, `ORDER_TO_TABLE_STATUS`
- `/app/frontend/src/components/layout/Header.jsx` — filters, search, view toggles

---

## Dashboard Dual-View System — Detailed Spec

### Overview

The dashboard supports **two switchable views**, toggled via a button in the header:

1. **"By Channel"** — columns grouped by order channel (Dine-In, TakeAway, Delivery, Room)
2. **"By Status"** — columns grouped by `fOrderStatus` (Preparing, Ready, Cancelled, Served, etc.)

When the active view switches, the **header filter pills swap** accordingly.

---

### View 1: By Channel (Current Implementation)

| Aspect | Detail |
|--------|--------|
| **Columns** | Dine-In, TakeAway, Delivery, Room |
| **Header filters** | Status pills — filter orders within all channel columns |
| **Arrows `<` `>`** | Independent per column, decrease/increase, min 1, no max |
| **Auto-hide** | Column hidden if 0 orders |
| **Smart defaults** | Measure container, distribute columns among visible channels |
| **Resets on login** | Yes |

---

### View 2: By Status (IMPLEMENTED ✅)

#### Status Column Definition

Every `fOrderStatus` value (1–10) gets its **own independent column**, displayed in priority order. Columns with 0 orders are auto-hidden.

| Column | fOrderStatus | Label | Status |
|--------|-------------|-------|--------|
| 1 | 7 | Yet to Confirm (YTC) | ✅ Implemented |
| 2 | 1 | Preparing | ✅ Implemented |
| 3 | 2 | Ready | ✅ Implemented |
| 4 | 8 | Running | ✅ Implemented |
| 5 | 5 | Served | ✅ Implemented |
| 6 | 9 | Pending Payment | ✅ Implemented |
| 7 | 6 | Paid | ✅ Implemented |
| 8 | 3 | Cancelled | ✅ Implemented |
| 9 | 10 | Reserved | ✅ Implemented (NEW) |

**Scheduled:** NOT a `fOrderStatus` value. Comes from the `order_status` field. No separate column. Scheduled orders appear based on their `fOrderStatus`. User must relogin/refresh context for scheduled order updates.

**Bill Ready:** Same as Paid = `fOrderStatus: 6`. Not a separate status.

#### Header Filters in By Status View (IMPLEMENTED ✅)

Channel pills: Del | Take | Dine | Room
- Clicking a channel filter → shows only that channel's orders across all status columns
- Multi-select supported (toggle individual channels)
- No "All" button — just toggle individual channels

#### Hide Feature (IMPLEMENTED ✅)

- Each column header has a **"Hide" link**
- Clicking "Hide" **completely removes** the column from view — even if it has orders
- **Linked hiding:** Hide a channel column → Also hides that channel's filter pill in Status View (and vice versa)
- Use case: Cook hides Served/Paid. Manager sees everything.
- Hidden state **resets on login** (no persistence)
- **Restore button:** "Show Hidden (N)" button appears in Header when items are hidden
- Clicking restore shows all hidden columns and filters

---

### Filter Swap Logic

| Active View | Columns Show | Header Filters Show |
|-------------|-------------|-------------------|
| By Channel | 4 channel columns | Status pills (Preparing, Ready, Cancelled, Served, Paid, YTC, Running, Pending Payment, Reserved) |
| By Status | Up to 10 status columns | Channel pills (Dine-In, TakeAway, Delivery, Room) |

---

### fOrderStatus Complete Mapping (Source of Truth)

Current `F_ORDER_STATUS` in `/app/frontend/src/api/constants.js`:

```javascript
export const F_ORDER_STATUS = {
  1: 'preparing',
  2: 'ready',
  3: 'cancelled',
  // 4: reserved for future development
  5: 'served',
  6: 'paid',          // Also = "Bill Ready"
  7: 'pending',        // = "Yet to Confirm"
  8: 'running',
  9: 'pendingPayment',
  // 10: 'reserved'    // NEW — to be added
};
```

**Changes needed:**
- Add `10: 'reserved'` to `F_ORDER_STATUS`
- Add corresponding `ORDER_TO_TABLE_STATUS` mapping for `reserved`
- fOrderStatus 4: leave unmapped for now (reserved for future)

---

### Unchanged Behavior (Both Views)

- Arrows `<` `>` — independent per column, decrease/increase, min 1 col, no max limit
- Smart defaults — measure container width, distribute among visible columns
- View-type aware — table view default 2 cols, order view default 1 col
- Layout resets on every login (no localStorage)
- Horizontal scroll when expanded beyond viewport
- Table view / Order view card toggle works within both dashboard views
- Auto-hide columns with 0 orders (unless manually shown)

---

### Implementation Plan for By Status View

#### Phase 1: Data Layer
1. Add `fOrderStatus: 10 → 'reserved'` to `F_ORDER_STATUS` in `constants.js`
2. Build `statusData` memo in `DashboardPage.jsx` — group ALL orders by `fOrderStatus` (similar to existing `channelData` memo but keyed by status)
3. Define `STATUS_COLUMNS` constant: ordered list of `{ id, fOrderStatus, label }` for all 10 statuses

#### Phase 2: View Toggle
4. Add view toggle state in `DashboardPage.jsx`: `dashboardView: 'channel' | 'status'`
5. Add toggle button/icon in `Header.jsx`
6. Conditionally render `ChannelColumnsLayout` with `channelData` OR `statusData` based on active view

#### Phase 3: Filter Swap
7. When `dashboardView === 'channel'` → Header shows status filter pills
8. When `dashboardView === 'status'` → Header shows channel filter pills
9. Filter logic: selected filters reduce the items shown within each column

#### Phase 4: Hide Feature
10. Add `hiddenColumns` state (Set) in layout component
11. Add "Hide" link in each column header
12. Add "Show hidden" restore mechanism in Header
13. Hidden state resets on login

#### Files to Modify
- `/app/frontend/src/api/constants.js` — add fOrderStatus 10
- `/app/frontend/src/pages/DashboardPage.jsx` — statusData memo, view toggle state, filter swap
- `/app/frontend/src/components/dashboard/ChannelColumnsLayout.jsx` — accept generic columns data (works for both channel and status views)
- `/app/frontend/src/components/dashboard/ChannelColumn.jsx` — add "Hide" link in header
- `/app/frontend/src/components/layout/Header.jsx` — view toggle button, swap filter pills, show hidden columns restore
