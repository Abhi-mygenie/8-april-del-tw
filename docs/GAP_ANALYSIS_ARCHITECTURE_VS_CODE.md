# Gap Analysis: Architecture/API Docs vs Current Code

**Version:** 1.0
**Date:** April 8, 2026
**Author:** Agent (Session 2 Fork)
**Scope:** Compare documented flows (ARCHITECTURE.md, API_DOCUMENT_V2.md, BUGS.md) against actual current codebase. Identify what works, what's broken, and what's a regression from the Channel Layout change.

---

## Table of Contents

1. [Methodology](#1-methodology)
2. [Flows Verified — No Gap](#2-flows-verified--no-gap)
3. [GAP 1 — handleItemStatusChange Missing Table Engage/Release](#3-gap-1--handleitemstatuschange-missing-table-engagerelease)
4. [GAP 2 — onFoodTransfer NOT Wired in Channel Layout](#4-gap-2--onfoodtransfer-not-wired-in-channel-layout)
5. [GAP 3 — onMergeOrder / onTableShift NOT Wired in Channel Layout](#5-gap-3--onmergeorder--ontableshift-not-wired-in-channel-layout)
6. [GAP 4 — handleTableClick Engaged Check Type Mismatch](#6-gap-4--handletableclick-engaged-check-type-mismatch)
7. [GAP 5 — BUG-216 free→engage Workaround Still Active](#7-gap-5--bug-216-freeengage-workaround-still-active)
8. [Summary Matrix](#8-summary-matrix)
9. [Recommended Fix Order](#9-recommended-fix-order)

---

## 1. Methodology

### Documents Used as Source of Truth
| Document | Path | What It Defines |
|----------|------|-----------------|
| ARCHITECTURE.md | `/app/memory/ARCHITECTURE.md` | Full system architecture, data flows, table engaged lock mechanism (§10, §11) |
| API_DOCUMENT_V2.md | `/app/memory/API_DOCUMENT_V2.md` | API endpoints, payloads, socket events per action |
| BUGS.md | `/app/memory/BUGS.md` | Known bugs, workarounds, open issues |

### Code Files Traced
| File | What Was Checked |
|------|-----------------|
| `DashboardPage.jsx` | All handler functions, prop wiring to old layout vs new channel layout |
| `ChannelColumnsLayout.jsx` | Props received, props forwarded to ChannelColumn |
| `ChannelColumn.jsx` | Props forwarded to TableCard (table view) and OrderCard (order view) |
| `TableCard.jsx` | How it calls `onMarkReady(table)`, `onMarkServed(table)`, etc. |
| `OrderCard.jsx` | How it calls `onMarkReady(order)`, `onItemStatusChange(order, item, status)`, etc. |
| `socketHandlers.js` | All socket event handlers, engage/release logic |

### Tracing Method
For each documented flow:
1. Start from user action (button click)
2. Trace through component → handler → API → socket → context update → UI update
3. Compare OLD layout path vs NEW channel layout path
4. Check data shapes at each handoff point

---

## 2. Flows Verified — No Gap

These flows were traced end-to-end and work identically in both old and new layouts.

### 2.1 Mark Ready / Mark Served (Table View)

**Documented Flow (ARCHITECTURE.md §11):**
```
User clicks Ready → setTableEngaged(tableId, true) → API call → Socket arrives → 
handleUpdateOrderStatus → fetchOrder → updateOrder/removeOrder → setTableEngaged(tableId, false)
```

**Old Layout Path:**
```
TableCard → onMarkReady(table) → handleMarkReady(tableEntry)
  tableEntry = adaptTable(t) → { orderId: order.orderId, tableId: t.tableId, ... }
  → if (tableId) setTableEngaged(tableId, true) ✅
  → await updateOrderStatus(orderId, role, 'ready') ✅
```

**New Channel Layout Path:**
```
ChannelColumn → TableCard → onMarkReady(table) → handleMarkReady(item)
  item = enrichTable(adaptTable(t)) → { orderId: order.orderId, tableId: t.tableId, order: order, ... }
  → if (tableId) setTableEngaged(tableId, true) ✅
  → await updateOrderStatus(orderId, role, 'ready') ✅
```

**Data shape verification:**
| Field | `adaptTable(t)` (line 214-228) | Present? |
|-------|-------------------------------|----------|
| `orderId` | `hasOrder ? order.orderId : undefined` | ✅ (if order exists) |
| `tableId` | `t.tableId` | ✅ (always present, Number) |

**Verdict: ✅ IDENTICAL — No gap.**

---

### 2.2 Mark Ready / Mark Served (Order View)

**Old Layout Path (DashboardPage.jsx line 992-993):**
```jsx
onMarkReady={() => handleMarkReady({ ...table, orderId: order.orderId, tableId: table.tableId || 0 })}
onMarkServed={() => handleMarkServed({ ...table, orderId: order.orderId, tableId: table.tableId || 0 })}
```
Explicit closure merges `table` + `order` data.

**New Channel Layout Path (ChannelColumn.jsx line 190-191):**
```jsx
onMarkReady={() => onMarkReady?.(item)}
onMarkServed={() => onMarkServed?.(item)}
```
Passes `item` from `channel.items`. This is a **zero-arg closure** passed as prop to OrderCard. OrderCard internally calls `onMarkReady?.(order)` (line 551), but since the prop is `() => onMarkReady?.(item)`, OrderCard's `order` argument is **discarded**. `handleMarkReady(item)` is called.

**Data shape verification for each channel:**
| Channel | `item` source | `orderId` | `tableId` |
|---------|--------------|-----------|-----------|
| dineIn (table) | `enrichTable(adaptTable(t))` | ✅ (line 225) | ✅ (line 218) |
| dineIn (walkIn) | `adaptWalkIn(order)` | ✅ (line 343) | `0` (line 337) |
| takeAway | `adaptOrder(order, 'takeAway')` | ✅ (line 359) | `0` (line 355) |
| delivery | `adaptOrder(order, 'delivery')` | ✅ (line 359) | `0` (line 355) |
| room | `allRoomsList` item | ✅ (line 322) | ✅ (line 312) |

For `tableId=0` (takeAway, delivery, walkIn): `handleMarkReady` line 723 `if (tableId)` → falsy → no spinner. **This is by design** — these channels have no physical table to lock.

**Verdict: ✅ Data shapes correct. No gap.**

---

### 2.3 Table Click → Open OrderEntry

**Old Layout:** `onClick={handleTableClick}` on TableCard.
**New Layout:** `onItemClick={onItemClick}` → TableCard `onClick={onItemClick}` → same `handleTableClick`.

**Data shape:** `item.id` (String), `item.orderType` — both present in all channel items.

`handleTableClick` (line 649-678):
- Checks `isTableEngaged(tableEntry.id)` — see GAP 4 below for type mismatch issue
- Routes by `tableEntry.orderType` → correct for all channels

**Verdict: ✅ Same path. (But see GAP 4 for engage check issue.)**

---

### 2.4 Bill Click

**Old Layout (Table View):** `onBillClick={handleBillClick}` → TableCard calls `onBillClick(table)`.
**Old Layout (Order View):** `onBillClick={() => handleBillClick({ id: \`del-${order.orderId}\`, orderId: order.orderId, orderType: 'delivery' })}` — explicit closure.

**New Layout:** `onBillClick={() => onBillClick?.(item)}` — passes `item` from channelData.

| Channel | `item.id` | `item.orderId` | `item.orderType` |
|---------|-----------|---------------|-----------------|
| dineIn | `String(tableId)` | ✅ | `'dineIn'` |
| takeAway | `"takeAway-${orderId}"` | ✅ | `'takeAway'` |
| delivery | `"delivery-${orderId}"` | ✅ | `'delivery'` |

`handleBillClick` → `handleTableClick(tableEntry)` + `setInitialShowPayment(true)`. Routes correctly by `orderType`.

**Verdict: ✅ Same behavior. No gap.**

---

### 2.5 Cancel Order (Card Level)

**Old Layout:** `onCancelOrder={handleCancelOrderFromCard}` → OrderCard calls with raw `order`.
**New Layout:** `onCancelOrder={onCancelOrder}` → same pass-through → OrderCard calls with raw `order`.

`handleCancelOrderFromCard` (line 772-782) builds a `tableEntry` from the order and opens `CancelOrderModal`.

**Verdict: ✅ Identical. No gap.**

---

### 2.6 Confirm Order (Yet-to-Confirm)

**Old Layout:** `onConfirmOrder={handleConfirmOrder}` → TableCard calls `onConfirmOrder(table)`.
**New Layout:** `onConfirmOrder={onConfirmOrder}` → same pass-through.

`handleConfirmOrder` (line 590) → `getOrderDataForEntry(tableEntry)`:
- For dine-in: `tableEntry.orderId` exists → searches `[...takeAwayOrders, ...deliveryOrders, ...walkInOrders]` → NOT found (dine-in orders not in these arrays) → falls through to `tableEntry.tableId` → `orderItemsByTableId[tableId]` ✅
- For takeaway/delivery: `tableEntry.orderId` → found in respective array ✅

**Verdict: ✅ Works correctly. No gap.**

---

### 2.7 isTableEngaged Spinner Overlay

**Old Layout:** `isEngaged={isTableEngaged(item.tableId)}` on TableCard.
**New Layout:** `isEngaged={isTableEngaged?.(item.tableId)}` on both TableCard (line 167) and OrderCard (line 181).

Both pass `item.tableId` (Number) which matches the Number stored in `engagedTables` Set.

**Verdict: ✅ Works correctly. No gap.**

---

### 2.8 All Socket Handlers

Socket handlers in `socketHandlers.js` operate independently of the dashboard layout. They interact with contexts (`OrderContext`, `TableContext`) which are consumed by both old and new layouts.

| Handler | Engage | API Fetch | Update Context | Release | Status |
|---------|--------|-----------|---------------|---------|--------|
| `handleNewOrder` | ✅ local engage (BUG-211 workaround) | ✅ fetchOrderWithRetry | ✅ addOrder + updateTableStatus | ✅ rAF×2 → release | ✅ Working |
| `handleUpdateOrder` | N/A (no engage) | ✅ fetchOrderWithRetry | ✅ updateOrder + syncTableStatus | ✅ rAF×2 → release | ✅ Working |
| `handleUpdateFoodStatus` | ✅ workaround engage (line 276-280) | ✅ fetchOrderWithRetry | ✅ updateOrder + syncTableStatus | ✅ rAF×2 → release | ✅ Working |
| `handleUpdateOrderStatus` | N/A | ✅ fetchOrderWithRetry | ✅ remove or update | ✅ rAF×2 → release | ✅ Working |
| `handleUpdateTable` | ✅ engage on 'engage' | N/A | ✅ updateTableStatus | See GAP 5 | ⚠️ BUG-216 |

**Verdict: ✅ No regression from channel layout change.**

---

## 3. GAP 1 — handleItemStatusChange Missing Table Engage/Release

### Severity: P1
### Regression from Channel Layout: NO (affects both layouts)
### Affects: Item-level Ready/Serve toggles on OrderCard (Dine-In)

### Documented Behavior (ARCHITECTURE.md §11)
```
1. setTableEngaged(tableId, true)    ← spinner ON
2. API call
3. Socket event arrives
4. Handler: fetch → update context → setTableEngaged(tableId, false)  ← spinner OFF
```

### Actual Code (DashboardPage.jsx line 754-769)
```javascript
const handleItemStatusChange = useCallback(async (order, item, newStatus) => {
  if (!order?.orderId || !item?.id) return;

  try {
    const payload = {
      order_id: order.orderId,
      order_food_id: item.foodId || item.id,
      item_id: item.id,
      order_status: newStatus,
      cancel_type: null,
    };
    await api.put(API_ENDPOINTS.FOOD_STATUS_UPDATE, payload);
  } catch (err) {
    console.error('[handleItemStatusChange] Failed:', err);
  }
}, []);
```

### What's Missing
1. **No `setTableEngaged(order.tableId, true)` before API call** — table has no spinner during API round-trip
2. **No `setTableEngaged(order.tableId, false)` on error** — if socket workaround fires but API failed, table stays locked
3. **`useCallback` has empty dependency array `[]`** — `setTableEngaged` is not captured

### How It Partially Works Anyway
The socket handler `handleUpdateFoodStatus` (socketHandlers.js line 271-301) has its own workaround:
```javascript
// WORKAROUND: Engage table when food status update arrives (backend sends no table event)
if (setTableEngaged && tableId && tableId !== 0) {
  setTableEngaged(tableId, true);
  // ... then after fetch + update, release via rAF×2
}
```
So the table gets engaged AFTER the socket arrives (not before the API call). There's a window where the table is unlocked during the API call → socket arrival.

### Data Flow with Gap
```
User clicks item Ready toggle
  → handleItemStatusChange(order, item, 'ready')
  → ❌ NO ENGAGE
  → await api.put(FOOD_STATUS_UPDATE, payload)
  → [GAP: table unlocked, user could click it]
  → Socket: update-food-status arrives
  → handleUpdateFoodStatus: setTableEngaged(tableId, true)  ← engage here (late)
  → fetchOrderWithRetry → updateOrder → syncTableStatus
  → rAF×2 → setTableEngaged(tableId, false)  ← release
```

### Expected Flow (to match architecture doc)
```
User clicks item Ready toggle
  → handleItemStatusChange(order, item, 'ready')
  → setTableEngaged(order.tableId, true)   ← engage BEFORE API
  → await api.put(FOOD_STATUS_UPDATE, payload)
  → Socket: update-food-status arrives
  → handleUpdateFoodStatus: skip engage (already engaged)
  → fetchOrderWithRetry → updateOrder → syncTableStatus
  → rAF×2 → setTableEngaged(tableId, false)  ← release
```

### Fix Required
Add `setTableEngaged` to `handleItemStatusChange`:
```javascript
const handleItemStatusChange = useCallback(async (order, item, newStatus) => {
  if (!order?.orderId || !item?.id) return;
  const tableId = Number(order.tableId);

  try {
    if (tableId) setTableEngaged(tableId, true);  // ← ADD

    const payload = { ... };
    await api.put(API_ENDPOINTS.FOOD_STATUS_UPDATE, payload);
  } catch (err) {
    if (tableId) setTableEngaged(tableId, false);  // ← ADD
    console.error('[handleItemStatusChange] Failed:', err);
  }
}, [setTableEngaged]);  // ← ADD dependency
```

### Files to Change
- `DashboardPage.jsx` — `handleItemStatusChange` function

---

## 4. GAP 2 — onFoodTransfer NOT Wired in Channel Layout

### Severity: P0 (Feature broken)
### Regression from Channel Layout: YES
### Affects: Food transfer button on OrderCard in new channel layout

### Documented Behavior
OrderCard shows a food transfer icon (gated by `food_transfer` permission). Clicking it should open OrderEntry with the transfer modal pre-loaded.

### Old Layout (Working — DashboardPage.jsx line 999)
```jsx
<OrderCard
  ...
  onFoodTransfer={(o, item) => handleFoodTransfer(o, item, table)}
/>
```
`handleFoodTransfer` (line 708-712):
```javascript
const handleFoodTransfer = (order, item, tableEntry) => {
  handleTableClick(tableEntry);           // Open OrderEntry
  setInitialTransferItem(item);           // Trigger transfer modal
};
```

### New Layout — Prop Chain Analysis
```
DashboardPage.jsx
  → ChannelColumnsLayout: ❌ onFoodTransfer is NOT in the props list (line 857-876)

ChannelColumnsLayout.jsx
  → Receives: onItemClick, onMarkReady, onMarkServed, onBillClick, onCancelOrder,
              onItemStatusChange, onToggleSnooze, onConfirmOrder, onUpdateStatus,
              hasPermission, snoozedOrders, currencySymbol, isTableEngaged,
              searchQuery, matchingIds
  → ❌ onFoodTransfer NOT received, NOT forwarded

ChannelColumn.jsx
  → OrderCard: ❌ onFoodTransfer NOT passed (line 174-195)
  → OrderCard receives undefined for onFoodTransfer

OrderCard.jsx
  → Food transfer icon onClick: onFoodTransfer?.(order, item) → undefined?.() → NO-OP
```

### Impact
- Food transfer icon **renders** (permission check passes) but **does nothing** when clicked
- User sees the button, clicks it, nothing happens — confusing UX

### Fix Required (3 files)
1. **DashboardPage.jsx** — Pass `onFoodTransfer` to `ChannelColumnsLayout`:
```jsx
<ChannelColumnsLayout
  ...
  onFoodTransfer={handleFoodTransfer}  // ← ADD
/>
```

2. **ChannelColumnsLayout.jsx** — Accept and forward to `ChannelColumn`:
```jsx
const ChannelColumnsLayout = ({ ..., onFoodTransfer }) => {
  ...
  <ChannelColumn
    ...
    onFoodTransfer={onFoodTransfer}  // ← ADD
  />
}
```

3. **ChannelColumn.jsx** — Accept and pass to OrderCard in order view:
```jsx
// In order view rendering:
<OrderCard
  ...
  onFoodTransfer={(o, item) => onFoodTransfer?.(o, item, item)}  // ← ADD
  // Note: 3rd arg is `item` (the tableEntry equivalent from channelData)
/>
```

### Files to Change
- `DashboardPage.jsx` — add prop
- `ChannelColumnsLayout.jsx` — accept and forward prop
- `ChannelColumn.jsx` — accept and wire to OrderCard

---

## 5. GAP 3 — onMergeOrder / onTableShift NOT Wired in Channel Layout

### Severity: P2 (Stubs — were console.log only)
### Regression from Channel Layout: YES (but low impact)
### Affects: Merge and Shift buttons on OrderCard in new channel layout

### Old Layout (DashboardPage.jsx line 997-998)
```jsx
<OrderCard
  ...
  onMergeOrder={(o) => console.log('[OrderCard] Merge order:', o.orderId)}
  onTableShift={(o) => console.log('[OrderCard] Shift table:', o.orderId)}
/>
```
These were **stubs** — they only logged to console, no real functionality.

### New Layout
- `ChannelColumnsLayout` does NOT receive or forward `onMergeOrder` or `onTableShift`
- `ChannelColumn` does NOT pass them to OrderCard
- OrderCard receives `undefined` → buttons do nothing (same as stubs, effectively)

### Impact
- **Low.** Old layout stubs did nothing useful either.
- BUT: OrderCard checks `canMergeOrder={hasPermission('merge_table')}` and `canShiftTable={hasPermission('transfer_table')}` — if permissions exist, buttons **render** but do nothing. Same behavior as old layout stubs (console.log vs nothing).
- Real merge/shift functionality was already broken by BUG-216 (source table gets permanently locked).

### Fix Required (When Ready to Implement)
Same pattern as GAP 2: thread prop through DashboardPage → ChannelColumnsLayout → ChannelColumn → OrderCard.

### Files to Change (future)
- `DashboardPage.jsx`
- `ChannelColumnsLayout.jsx`
- `ChannelColumn.jsx`

---

## 6. GAP 4 — handleTableClick Engaged Check Type Mismatch

### Severity: P1 (Silent failure — block-click never works)
### Regression from Channel Layout: NO (affects both layouts since original code)
### Affects: All table clicks on engaged tables

### Documented Behavior (ARCHITECTURE.md §11)
```
Table engaged → user cannot click table → spinner overlay blocks interaction
```

### Two Separate Mechanisms

**Mechanism A: Visual overlay (WORKS ✅)**
```jsx
// TableCard / OrderCard
isEngaged={isTableEngaged(item.tableId)}
// item.tableId = Number (e.g., 6244)
// engagedTables Set contains Number (e.g., 6244)
// Set.has(6244) → true ✅
```

**Mechanism B: Click blocking (BROKEN ❌)**
```javascript
// DashboardPage.jsx line 656
const handleTableClick = (tableEntry) => {
  if (isTableEngaged(tableEntry.id)) {   // ← tableEntry.id is a STRING
    console.log(`[Dashboard] Blocked click on engaged table ${tableEntry.id}`);
    return;
  }
  ...
};
```
```
tableEntry.id = String(tableId) = "6244"     ← String
engagedTables Set contains 6244              ← Number
Set.has("6244") when set has 6244 → false    ← Type mismatch!
```

### Why It's Not Noticed
The visual overlay (Mechanism A) covers the entire card with a spinner + semi-transparent background. Users see the spinner and don't try to click. Even if they did, the click handler would let them through (not blocked), but OrderEntry would open with stale/loading data.

### Fix Required
```javascript
// DashboardPage.jsx line 656
if (isTableEngaged(Number(tableEntry.tableId) || tableEntry.id)) {
```
Or more robustly:
```javascript
const numericId = Number(tableEntry.tableId || tableEntry.id);
if (numericId && isTableEngaged(numericId)) {
```

### Files to Change
- `DashboardPage.jsx` — `handleTableClick` function

---

## 7. GAP 5 — BUG-216 free→engage Workaround Still Active

### Severity: P0 (Breaks Shift Table and Merge Table)
### Regression from Channel Layout: NO (pre-existing bug)
### Affects: Shift table, merge table, cancel item flows

### Current Code (socketHandlers.js line 435-440)
```javascript
} else if (socketStatus === 'free') {
  // BUG-216 workaround: Backend sends 'free' for cancel-item but should send 'engage'
  // Treat 'free' as 'engage' — lock the table until GET enrichment completes
  if (setTableEngaged) setTableEngaged(tableId, true);
  log('INFO', `update-table: Table ${tableId} ENGAGED (free→engage workaround, BUG-216)`);
}
```

### Why It Exists
Backend sends `update-table free` for cancel-item operations, but the frontend needs the table locked during the GET fetch that follows. Without the workaround, the table flickers to "available" briefly, then back to "occupied" after the GET completes.

### What It Breaks

**Shift Table:**
```
Socket events:
1. update-table 6235 engage     ← Destination locked ✅
2. update-order 730482          ← Order moved to 6235
3. update-table 5507 free       ← Source should be freed
   → Workaround converts to ENGAGE → Source LOCKED permanently ❌
```

**Merge Table:**
```
Socket events:
1. update-table 6235 engage     ← Destination locked ✅
2. update-order 730506          ← Order merged to 6235
3. update-table 6476 free       ← Source should be freed
   → Workaround converts to ENGAGE → Source LOCKED permanently ❌
```

### Documented Fix (from BUGS.md)
1. **Revert** the blanket free→engage workaround — let `free` genuinely free the table
2. **Cancel item:** Engage table locally in `handleItemStatusChange` before API call (GAP 1 fix)
3. **Shift/Merge:** `free` on source table works correctly (table becomes available)

### Backend Fix Needed (from BUGS.md)
Backend should send `engage → process → free` for ALL flows, not just some.

### Dependencies
- GAP 1 fix (handleItemStatusChange engage) should be applied BEFORE removing the BUG-216 workaround
- Without GAP 1 fix, removing the workaround would leave cancel-item with no table lock at all

### Files to Change
- `socketHandlers.js` — `handleUpdateTable` function
- `DashboardPage.jsx` — `handleItemStatusChange` (GAP 1 must be fixed first)

---

## 8. Summary Matrix

| # | Gap | Description | Severity | Regression? | Old Layout | New Layout |
|---|-----|-------------|----------|-------------|------------|------------|
| **GAP 1** | `handleItemStatusChange` no engage | Item-level Ready/Serve has no table spinner during API call | P1 | NO | ❌ Broken | ❌ Broken |
| **GAP 2** | `onFoodTransfer` not wired | Food transfer icon does nothing in channel layout | **P0** | **YES** | ✅ Working | ❌ Broken |
| **GAP 3** | `onMergeOrder`/`onTableShift` not wired | Buttons show but do nothing (were stubs anyway) | P2 | YES | ⚠️ Stub only | ❌ Not wired |
| **GAP 4** | `handleTableClick` type mismatch | Block-click on engaged table never works (visual overlay still works) | P1 | NO | ❌ Broken | ❌ Broken |
| **GAP 5** | BUG-216 free→engage workaround | Shift/Merge source table permanently locked | **P0** | NO | ❌ Broken | ❌ Broken |

### What's Confirmed Working (No Gap)
| Flow | Table View | Order View | Notes |
|------|-----------|------------|-------|
| Mark Ready | ✅ | ✅ | Data shapes correct for all channels |
| Mark Served | ✅ | ✅ | Same as Mark Ready |
| Table Click → OrderEntry | ✅ | ✅ | Routes by orderType correctly |
| Bill Click | ✅ | ✅ | Opens OrderEntry with payment panel |
| Cancel Order | ✅ | ✅ | Opens CancelOrderModal correctly |
| Confirm Order | ✅ | ✅ | getOrderDataForEntry finds order for all channels |
| isEngaged Overlay | ✅ | ✅ | Spinner shows correctly (Number comparison works) |
| All Socket Handlers | ✅ | ✅ | Operate on contexts, independent of layout |

---

## 9. Recommended Fix Order

### Phase 1: Fix Regressions from Channel Layout (P0)
1. **GAP 2** — Wire `onFoodTransfer` through ChannelColumnsLayout → ChannelColumn → OrderCard
   - 3 files to change
   - Low risk, pure prop threading

### Phase 2: Fix Pre-Existing Bugs (P0-P1)
2. **GAP 1** — Add `setTableEngaged` to `handleItemStatusChange`
   - 1 file to change
   - Prerequisite for GAP 5 fix

3. **GAP 5** — Remove BUG-216 free→engage workaround
   - 1 file to change
   - MUST do GAP 1 first (otherwise cancel-item has no lock at all)
   - Fixes Shift Table and Merge Table source table permanent lock

4. **GAP 4** — Fix type mismatch in `handleTableClick` engaged check
   - 1 file to change
   - Low risk

### Phase 3: Future (P2)
5. **GAP 3** — Wire `onMergeOrder` / `onTableShift` (when real implementations exist)
   - Currently stubs — no urgency

---

## Appendix A: Data Shape Reference

### adaptTable(t) — Dine-In Tables (DashboardPage.jsx line 209-228)
```javascript
{
  id: String(t.tableId),        // "6244"
  label: t.tableNumber,         // "5"
  status: order.tableStatus,    // "occupied" | "billReady" | ...
  tableId: t.tableId,           // 6244 (Number)
  orderType: 'dineIn',
  amount: order.amount,         // 616
  time: order.time,             // "1 days"
  orderNumber: order.orderNumber, // "016790"
  fOrderStatus: order.fOrderStatus, // 1 | 2 | 5 | 7
  orderId: order.orderId,       // 730522 (Number)
  waiter: order.waiter,         // "Owner"
}
```

### adaptWalkIn(order) — Walk-In Orders (DashboardPage.jsx line 333-348)
```javascript
{
  id: `wc-${order.orderId}`,    // "wc-730580"
  label: order.customer,         // "Walk-In"
  status: order.tableStatus,
  tableId: 0,                    // Always 0
  orderId: order.orderId,        // 730580 (Number)
  orderType: 'walkIn',
  order: order,                  // Full order object
  ...
}
```

### adaptOrder(order, type) — TakeAway/Delivery Orders (DashboardPage.jsx line 351-364)
```javascript
{
  id: `${type}-${order.orderId}`, // "takeAway-730583"
  label: order.customer,
  status: order.tableStatus,
  tableId: 0,                     // Always 0
  orderId: order.orderId,         // 730583 (Number)
  orderType: type,                // "takeAway" | "delivery"
  order: order,                   // Full order object
  ...
}
```

### enrichTable(table) — Adds order reference to dine-in table (DashboardPage.jsx line 367-376)
```javascript
{
  ...adaptTable(t),              // All fields from adaptTable
  order: order,                  // Full order object from OrderContext (if exists)
}
```

---

## Appendix B: Handler Dependency Chain

```
handleMarkReady(tableEntry)
  ├── Needs: tableEntry.orderId (Number)
  ├── Needs: tableEntry.tableId (Number, 0 for non-table)
  ├── Uses: setTableEngaged (from useTables)
  └── Uses: updateOrderStatus (from orderService)

handleMarkServed(tableEntry)
  └── Same as handleMarkReady

handleItemStatusChange(order, item, newStatus)
  ├── Needs: order.orderId (Number)
  ├── Needs: item.id (Number)
  ├── Needs: item.foodId (Number)
  ├── MISSING: setTableEngaged ← GAP 1
  └── Uses: api.put(FOOD_STATUS_UPDATE)

handleFoodTransfer(order, item, tableEntry)
  ├── Needs: tableEntry (for handleTableClick)
  ├── Needs: item (for setInitialTransferItem)
  └── NOT WIRED in channel layout ← GAP 2

handleConfirmOrder(tableEntry)
  ├── Needs: getOrderDataForEntry(tableEntry) to find order
  ├── Needs: order.items for loop
  └── Uses: api.put(FOOD_STATUS_UPDATE) per item

handleBillClick(tableEntry)
  ├── Needs: tableEntry (for handleTableClick)
  └── Sets: initialShowPayment = true

handleCancelOrderFromCard(order)
  ├── Needs: order.tableId, order.orderId
  └── Opens: CancelOrderModal
```

---

*Document created for gap analysis and debugging reference. To be updated after fixes are applied.*
