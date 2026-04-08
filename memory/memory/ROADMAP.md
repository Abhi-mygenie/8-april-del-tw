# Roadmap

## Completed ✅

### 1. Wire `onFoodTransfer` in Channel Layout (GAP 2) ✅
- **Status:** DONE (April 2026)
- **What:** Food transfer icon was not working in channel layout
- **Fix:** Threaded `onFoodTransfer` prop through DashboardPage → ChannelColumnsLayout → ChannelColumn → OrderCard
- **Files Modified:** `DashboardPage.jsx`, `ChannelColumnsLayout.jsx`, `ChannelColumn.jsx`

### 3. Dashboard Dual-View System ("By Status" View) ✅
- **Status:** DONE (April 2026)
- **What:** Dashboard can now toggle between "By Channel" and "By Status" views
- **Features Implemented:**
  - Toggle buttons in Header (Columns icon = Channel, BarChart icon = Status)
  - Filter swap: Channel View → 9 Status filters, Status View → Channel filters
  - Hide column feature with linked filter hiding
  - Restore hidden button
  - All 9 status filters (YTC, Preparing, Ready, Running, Served, Pending Pay, Paid, Cancelled, Reserved)
- **Files Modified:** `constants.js`, `featureFlags.js`, `DashboardPage.jsx`, `ChannelColumnsLayout.jsx`, `ChannelColumn.jsx`, `Header.jsx`

### 6. Remove Channel Filter Buttons from Header ✅
- **Status:** DONE (April 2026) - Merged into Dual-View implementation
- **What:** Removed redundant "All/Del/Take/Dine/Room" static pills from left side of Header
- **Now:** Single filter section that swaps based on view (Status filters for Channel view, Channel filters for Status view)

### Header UX Improvement — Option A (Labeled Dropdowns) ✅
- **Status:** DONE (April 2026)
- **What:** Replaced confusing icon-only toggles with clear labeled dropdown buttons
- **Changes:**
  - `[+]` icon → `[+ Add]` labeled button
  - Grid/List icon toggle → `[Table ▾]` dropdown (Table View / Order View)
  - Columns/BarChart icon toggle pair → `[Channel ▾]` / `[Status ▾]` dropdown (By Channel / By Status)
  - Dropdown labels dynamically reflect current selection
  - Only one dropdown open at a time; closes on outside click
- **Files Modified:** `Header.jsx`
- **Testing:** 18/18 tests passed (100%)

### Status Configuration Page (Visibility Settings) ✅
- **Status:** DONE (April 2026)
- **What:** New page to configure which statuses are visible on the dashboard
- **Location:** Sidebar → Visibility Settings → Status Configuration
- **Features:**
  - Grid of 9 status cards with enable/disable toggle
  - Enable All / Disable All buttons
  - Reset to Default button
  - Save Configuration (persists to localStorage)
  - Unsaved changes indicator with "Save Now" toast
  - Affects both Channel View (filters) and Status View (columns)
- **Files Created:** `StatusConfigPage.jsx`
- **Files Modified:** `Sidebar.jsx`, `App.js`, `DashboardPage.jsx`, `Header.jsx`
- **Storage:** localStorage (`mygenie_enabled_statuses`)
- **Future:** Will be replaced by role-based permissions from backend

---

## P0 — Must Fix Now

### 2. Add `setTableEngaged` to `handleItemStatusChange` (GAP 1)
- **What:** Item-level Ready/Serve has no table spinner during API call
- **Why:** `handleItemStatusChange` never calls `setTableEngaged`
- **Fix:** Add engage before API call, release on error
- **Files:** `DashboardPage.jsx`

---

## P1 — Important Features

### 4. Fix `handleTableClick` Type Mismatch (GAP 4)
- **What:** Block-click on engaged table checks String vs Number → never matches
- **Fix:** `Number(tableEntry.tableId || tableEntry.id)` in comparison
- **Files:** `DashboardPage.jsx`

### 5. Remove BUG-216 free→engage Workaround (GAP 5)
- **What:** Shift/Merge source table permanently locked
- **Prerequisite:** GAP 1 must be fixed first
- **Fix:** Let `free` genuinely free the table in `handleUpdateTable`
- **Files:** `socketHandlers.js`

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
7. **Dual-View Filter Logic:** 
   - Channel View (columns = channels) → Show Status filters (all 9)
   - Status View (columns = statuses) → Show Channel filters (Del, Take, Dine, Room)
   - Hide column → Also hides corresponding filter in other view
8. **fOrderStatus mapping:** 1=preparing, 2=ready, 3=cancelled, 4=future, 5=served, 6=paid/billReady, 7=YTC, 8=running, 9=pendingPayment, 10=reserved. 
9. **Status Filter IDs:** pending (7), preparing (1), ready (2), running (8), served (5), pendingPayment (9), paid (6), cancelled (3), reserved (10)
10. **Cards are independent:** All state is managed via Context (OrderContext, TableContext). View layer just groups and filters - no data modification.
11. **Header UX (Option A):** Icon toggles are confusing when clustered. Labeled dropdowns (`[Table ▾]`, `[Channel ▾]`) with dynamic labels and checkmarks are much clearer. Only one dropdown open at a time. Close on outside click.
