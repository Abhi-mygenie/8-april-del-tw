# Roadmap

## P0 — Must Fix Now

### 1. Wire `onFoodTransfer` in Channel Layout (GAP 2)
- **What:** Food transfer icon does nothing in new channel layout
- **Why:** Prop not threaded through ChannelColumnsLayout → ChannelColumn → OrderCard
- **Fix:** Thread `onFoodTransfer` prop through 3 files
- **Files:** `DashboardPage.jsx`, `ChannelColumnsLayout.jsx`, `ChannelColumn.jsx`

### 2. Add `setTableEngaged` to `handleItemStatusChange` (GAP 1)
- **What:** Item-level Ready/Serve has no table spinner during API call
- **Why:** `handleItemStatusChange` never calls `setTableEngaged`
- **Fix:** Add engage before API call, release on error
- **Files:** `DashboardPage.jsx`

---

## P1 — Important Features

### 3. Dashboard Dual-View System ("By Status" View)
- **What:** New dashboard view where columns are grouped by `fOrderStatus` (1–10)
- **Phases:**
  - Phase 1: Data layer — `statusData` memo, add fOrderStatus 10 (reserved)
  - Phase 2: View toggle button in Header
  - Phase 3: Filter swap (channel view → status filters, status view → channel filters)
  - Phase 4: Hide feature per column
- **Files:** `constants.js`, `DashboardPage.jsx`, `ChannelColumnsLayout.jsx`, `ChannelColumn.jsx`, `Header.jsx`
- **See:** PRD.md "Dashboard Dual-View System" section for full spec

### 4. Fix `handleTableClick` Type Mismatch (GAP 4)
- **What:** Block-click on engaged table checks String vs Number → never matches
- **Fix:** `Number(tableEntry.tableId || tableEntry.id)` in comparison
- **Files:** `DashboardPage.jsx`

### 5. Remove BUG-216 free→engage Workaround (GAP 5)
- **What:** Shift/Merge source table permanently locked
- **Prerequisite:** GAP 1 must be fixed first
- **Fix:** Let `free` genuinely free the table in `handleUpdateTable`
- **Files:** `socketHandlers.js`

### 6. Remove Channel Filter Buttons from Header
- **What:** Header still shows All/Del/Take/Dine/Room filter buttons
- **Why:** Redundant when "By Channel" view shows channels as columns
- **Guard:** Only hide when `USE_CHANNEL_LAYOUT = true`
- **File:** `Header.jsx`

---

## P2 — Future / Backlog

### 7. Phase B: Drag-to-Resize
- ResizeHandle between channels allows drag to resize
- Component exists (`ResizeHandle.jsx`) but not rendered currently
- Wire drag to change `maxColumns` state

### 8. Wire `onMergeOrder`/`onTableShift` in Channel Layout (GAP 3)
- Currently stubs (console.log only in old layout, not wired in new)
- Implement when real merge/shift functionality exists

### 9. Clean Up Deprecated Code
- Remove `TableSection.jsx` and old area-grouping logic from `DashboardPage.jsx`
- Remove feature flag once channel layout is fully approved
- Delete `useLocalStorage.js` if unused elsewhere

### 10. Implement `clear_payment` Functionality
- Currently ignored by user request, but noted in original codebase

### 11. Implement `serve` Button API Integration
- Serve button exists in UI but needs backend API wiring

### 12. Fix Backend Table Socket Bug
- Backend doesn't emit `update_table` socket events when `update-food-status` is triggered
- Frontend workaround (table lock during fetch) currently in place
- Proper fix requires backend changes

---

## Lessons Learned (for future agents)

1. **Arrow behavior:** User wants INDEPENDENT channel control. `<` = decrease self, `>` = increase self. NO coupling to adjacent channels.
2. **No localStorage for layout:** User explicitly wants fresh defaults on every login.
3. **View-type defaults:** Table view = 2 cols default, Order view = 1 col default.
4. **Smart defaults:** Measure container width, count visible channels, divide equally. Calculate `floor(availablePerChannel / cardUnit)`.
5. **Don't touch card sizes:** Table card = 160px, Order card = 300px. These are fixed. Recover space from padding layers instead.
6. **Spacing plan:** Removed content-container wrapper, tightened main/header/channel padding, removed ResizeHandle bars. Max 7 table cards on 1440px without changing cards.
7. **Filter behavior:** Current status filters (Confirm, Cooking, Ready, Running, Schedule) are mostly UI-only dummies. Only Confirm and Schedule filter in old table view via `tableFilter`. New channel layout has NO filter integration yet.
8. **fOrderStatus mapping:** 1=preparing, 2=ready, 3=cancelled, 4=future, 5=served, 6=paid/billReady, 7=YTC, 8=running, 9=pendingPayment, 10=reserved(NEW). Scheduled is from `order_status` field, not `fOrderStatus`.
