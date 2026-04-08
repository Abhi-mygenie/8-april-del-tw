# Bug Tracker

## Document Version: 1.0
## Last Updated: April 8, 2026

---

## Active Bugs

### BUG-001: ResizeHandle Drag Not Updating UI
- **Status:** PARKED (Phase B)
- **Priority:** P1
- **Component:** `ChannelColumnsLayout.jsx`, `ResizeHandle.jsx`
- **Symptoms:** Drag events are detected (MOUSEMOVE deltaX logs in console). But column widths don't change visually.
- **Root Cause:** Column widths are calculated in fixed pixels. The `handleResize` function updates `maxColumns` state but the pixel-based width model doesn't translate drag distance reliably. Needs flex model first.
- **Reproduction:** Click and drag the grey bar between two channel columns on the dashboard.
- **Blocked By:** BUG-003 (Grey space / pixel width model)
- **Fix Plan:** After switching to flex model (BUG-003), wire drag delta to flex ratios instead of pixel columns.

---

### BUG-002: `enabledChannels` ReferenceError (Intermittent)
- **Status:** OPEN
- **Priority:** P0
- **Component:** `ChannelColumnsLayout.jsx`
- **Symptoms:** On some logins, the dashboard crashes with: `ReferenceError: Cannot access 'enabledChannels' before initialization`
- **Root Cause:** React hooks ordering issue. A `useEffect` referencing `enabledChannels` (a `useMemo`) was declared BEFORE the `useMemo`. Fixed by reordering, but user may still see it due to cached browser JS bundles.
- **Reproduction:** Login, navigate to dashboard. May appear intermittently.
- **Fix Applied:** Reordered hooks so `enabledChannels` useMemo is declared before the useEffect that references it.
- **Remaining Risk:** Browser cache may serve stale JS. Hard refresh or cache clear needed.
- **Files:** `ChannelColumnsLayout.jsx` lines 77-121

---

### BUG-003: Grey Space on Right Side of Dashboard
- **Status:** OPEN
- **Priority:** P0
- **Component:** `ChannelColumn.jsx`
- **Symptoms:** When channels don't perfectly fill the viewport width, a grey gap appears on the right side of the dashboard.
- **Root Cause:** Channel container uses fixed pixel widths calculated as:
  ```
  columnWidth = (actualColumns * cardWidth) + ((actualColumns - 1) * GAP) + PADDING
  ```
  Applied as `width: ${columnWidth}px; minWidth: ${columnWidth}px; flex-shrink: 0`. This never fills 100% of available space.
- **Pixel Math Example (1440px screen, sidebar expanded):**
  ```
  Available: 1440 - 280 (sidebar) - 96 (padding) = 1064px
  6 table cards: (6 × 160) + (5 × 12) + 24 = 1044px → 20px grey gap
  7 table cards: (7 × 160) + (6 × 12) + 24 = 1216px → overflows by 152px
  ```
- **Fix Plan:** Switch from fixed pixel widths to `flex: maxColumns` on channel containers. Grid inside uses `repeat(auto-fill, 160px)` so cards stay 160px but container fills available space.
- **Files:** `ChannelColumn.jsx` lines 74-84

---

### BUG-004: Table Engage/Spinner Flow — Analysis Required
- **Status:** UNDER INVESTIGATION
- **Priority:** P0
- **Component:** `DashboardPage.jsx`, `ChannelColumn.jsx`, `socketHandlers.js`
- **Reported By:** User (April 8, 2026)
- **Symptoms:** When user performs actions (mark ready, mark served), the table engage/spinner flow doesn't work. No `[ENGAGED]` or `[released]` logs in console.

#### Expected Flow
```
1. User clicks Ready/Serve button
2. handleMarkReady/handleMarkServed called
3. setTableEngaged(tableId, true) → spinner ON
4. API call (updateOrderStatus)
5. Socket event received (update-order-status)
6. Socket handler fetches fresh order via GET API
7. updateOrder in context
8. setTableEngaged(tableId, false) → spinner OFF
```

#### Console Evidence
```
[SocketHandler] update-order-status received: 730580, socket status: 5 (ignored — fetching API)
[SocketHandler] Fetching order 730580 (attempt 1)
[SocketHandler] Fetched order 730580 successfully
[SocketHandler] update-order-status: Updated order 730580 (status: served)
[OrderContext] updateOrder: Updating order 730580
[Layout] Dine-In: 1col | TakeAway: 1col | Delivery: 1col | Room: 1col
```
**Missing:** No `Table X ENGAGED` log, no `Table X released from ENGAGED` log.

#### Detailed Trace — All Possible Code Paths

##### Path A: TakeAway/Delivery Orders (tableId = 0)
```
User clicks Serve on TakeAway card
  → OrderCard calls onMarkServed(order) [OrderCard.jsx:561]
  → ChannelColumn passes: onMarkServed={() => onMarkServed?.(item)} [ChannelColumn.jsx:192]
  → item = adaptOrder(order, 'takeAway') → { tableId: 0, orderId: X, order: rawOrder }
  → BUT OrderCard receives order={item.order || item} [ChannelColumn.jsx:173]
  → OrderCard calls onMarkServed(order) where order = rawOrder from OrderContext
  → rawOrder.tableId = 0 (from orderTransform.js:158 → api.table_id || 0)
  → handleMarkServed(tableEntry) [DashboardPage.jsx:735]
  → const tableId = Number(0) = 0
  → if (tableId) → if (0) → FALSE → setTableEngaged NEVER called
  → API call succeeds
  → Socket handler releases: order.tableId = 0 → falsy → release NEVER called
  RESULT: No engage, no release. EXPECTED for TakeAway — no physical table to lock.
```

##### Path B: Dine-In Tables — Table View (tableId > 0)
```
User clicks Ready on Dine-In TableCard
  → TableCard calls onMarkReady(table) [TableCard.jsx:180]
  → ChannelColumn passes: onMarkReady={onMarkReady} [ChannelColumn.jsx:163]
  → table = enrichTable(adaptTable(apiTable))
  → table = { id: "123", tableId: 123, orderId: 456, status: "occupied", ... }
  → handleMarkReady(tableEntry) [DashboardPage.jsx:716]
  → tableEntry.orderId = 456 ✅ (not undefined, passes guard on line 717)
  → const tableId = Number(123) = 123
  → if (tableId) → TRUE → setTableEngaged(123, true) → SPINNER ON
  → API call updateOrderStatus(456, role, 'ready')
  → Socket: update-order-status received
  → handleUpdateOrderStatus: fetches order, updates context
  → Line 346: order.tableId = 123 → truthy → setTableEngaged(123, false) → SPINNER OFF
  RESULT: SHOULD work. Engage + release both fire.
```

##### Path C: Dine-In Tables — Order View via ChannelColumn
```
User clicks Ready on Dine-In OrderCard
  → OrderCard calls onMarkReady(order) [OrderCard.jsx:551]
  → ChannelColumn passes: onMarkReady={() => onMarkReady?.(item)} [ChannelColumn.jsx:191]
  → item = enrichTable(adaptTable(apiTable)) = { tableId: 123, orderId: 456, order: rawOrder, ... }
  → BUT OrderCard receives order={item.order || item} [ChannelColumn.jsx:173]
  → item.order = rawOrder (from enrichTable) → order = rawOrder
  → OrderCard calls onMarkReady(rawOrder)
  → rawOrder = { orderId: 456, tableId: 123, ... } (from orderTransform)
  → handleMarkReady(tableEntry) → tableEntry = rawOrder
  → tableEntry.orderId = 456 ✅
  → tableId = Number(123) = 123 → setTableEngaged(123, true) → SPINNER ON
  RESULT: SHOULD work.
```

##### Path D: Dine-In — Order View (OLD layout, for comparison)
```
Old layout wraps the handler:
  onMarkReady={() => handleMarkReady({ ...table, orderId: order.orderId, tableId: table.tableId || 0 })}
  → Explicitly merges table + order fields
  → Guarantees orderId and tableId are present
  RESULT: Works by construction.
```

##### Path E: Item-Level Status Change (Ready/Serve per individual item)
```
User expands OrderCard, clicks Ready on a specific food item
  → OrderCard calls onItemStatusChange(order, item, 'ready') [OrderCard.jsx:156-157]
  → handleItemStatusChange(order, item, newStatus) [DashboardPage.jsx:754]
  → Calls API: api.put(FOOD_STATUS_UPDATE, payload)
  → ❌ NO setTableEngaged() call at all — never engages table
  → Socket: update-food-status received
  → handleUpdateFoodStatus in socketHandlers.js:
    → Gets existingOrder from context (has tableId)
    → setTableEngaged(tableId, true) → ENGAGE
    → Fetches order, updates context
    → setTableEngaged(tableId, false) → RELEASE
  RESULT: No pre-engage from user action. Socket handler does engage+release,
          but there's a gap window between API call and socket event where
          table is NOT engaged.
```

##### Path F: Walk-In Orders (tableId = 0, dineIn channel)
```
Same as Path A — tableId = 0 → no engage/release. Expected.
```

#### Key Findings

| # | Path | Engage Works? | Release Works? | Issue? |
|---|------|--------------|----------------|--------|
| A | TakeAway/Delivery | No (tableId=0) | No | Expected — no table |
| B | Dine-In Table View | Should work | Should work | Needs user confirmation |
| C | Dine-In Order View (new) | Should work | Should work | Needs user confirmation |
| D | Dine-In Order View (old) | Works (explicit wrap) | Works | Reference implementation |
| E | Item-level status | NO | Yes (socket handler) | **Missing engage before API call** |
| F | Walk-In | No (tableId=0) | No | Expected — no table |

#### What User Tested
Console logs show orders **730580** and **730583** — both are `update-order-status` events. The status = 5 (served). These appear to be **TakeAway orders** based on the screenshot (TakeAway channel, "TA" labels). For TakeAway, `tableId = 0` → no engage/release is **correct behavior**.

#### Action Items
1. **Confirm with user:** Are you seeing the missing spinner on Dine-In tables specifically? Or only on TakeAway?
2. **If Dine-In also broken:** Add console.log to `handleMarkReady`/`handleMarkServed` to trace the exact `tableEntry` object and `tableId` value.
3. **Item-level gap (Path E):** `handleItemStatusChange` needs `setTableEngaged` call before API call, matching the pattern in `handleMarkReady`/`handleMarkServed`.
4. **`onFoodTransfer` not wired in new layout** — ChannelColumnsLayout accepts prop but doesn't forward to ChannelColumn or OrderCard.

---

### BUG-005: `onFoodTransfer` Not Wired in Channel Layout
- **Status:** OPEN
- **Priority:** P1
- **Component:** `ChannelColumnsLayout.jsx`, `ChannelColumn.jsx`
- **Symptoms:** Food Transfer button on OrderCard doesn't work in the new channel layout.
- **Root Cause:** `onFoodTransfer` prop is accepted by `ChannelColumnsLayout` but never forwarded to `ChannelColumn`. And `ChannelColumn` doesn't pass it to `OrderCard`.
- **Old Layout (working):** `onFoodTransfer={(o, item) => handleFoodTransfer(o, item, table)}` passed directly to each OrderCard.
- **New Layout (broken):** `ChannelColumnsLayout` accepts `onFoodTransfer` prop but it's not in the JSX spread to `ChannelColumn`.
- **Fix:** Forward `onFoodTransfer` through ChannelColumnsLayout → ChannelColumn → OrderCard.

---

### BUG-006: Backend Table Socket Not Firing for Food Status Updates
- **Status:** KNOWN (Backend Issue)
- **Priority:** P2
- **Component:** Backend (external — `preprod.mygenie.online`)
- **Symptoms:** When `update-food-status` API is called (item-level Ready/Serve), the backend does NOT emit an `update-table` socket event. Only `update-food-status` socket event is emitted.
- **Workaround:** Frontend `handleUpdateFoodStatus` in `socketHandlers.js` manually engages/releases the table via `setTableEngaged`.
- **Impact:** Minor timing gap between API call and socket event where table is not locked.
- **Fix Required:** Backend must emit `update-table` socket events for food status changes.

---

## Resolved Bugs

### BUG-R01: Duplicate React Keys in Dine-In Channel
- **Status:** FIXED (April 7, 2026)
- **Root Cause:** `channelData.dineIn.items` included walk-in orders twice — once from `allTablesList` (which already contained walk-in virtual entries) and again from `walkInOrders.map(adaptWalkIn)`.
- **Fix:** Changed filter to `allTablesList.filter(t => !t.isRoom && !t.isWalkIn)` to exclude walk-in entries before appending adapted walk-in orders.
- **File:** `DashboardPage.jsx` line 383

### BUG-R02: `useLocalStorage` Persisting Layout Across Sessions
- **Status:** FIXED (April 7, 2026)
- **Root Cause:** `maxColumns` was stored in localStorage via `useLocalStorage` hook. User wanted fresh defaults on every login.
- **Fix:** Replaced `useLocalStorage` with `useState`. Added cleanup effect to remove stale `mygenie_channel_max_columns` key.
- **File:** `ChannelColumnsLayout.jsx`
