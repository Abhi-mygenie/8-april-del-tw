# Channel-Based Layout Redesign - Technical Specification

## Document Version: 1.0
## Date: April 7, 2026
## Status: Planning

---

## 1. Executive Summary

### Current State
The dashboard currently groups tables/orders by **restaurant areas** (Default, out, in, Walk-In, etc.) in both Table View and List View. Channel filters (Dine-In, TakeAway, Delivery, Room) are used to filter which items are displayed.

### Target State  
Replace area-based grouping with **channel-based columns**. Each channel becomes a dedicated column with:
- Single card width per column
- Resizable column widths via drag
- Collapsible columns
- Persisted widths in localStorage
- Channel filters REMOVED (channels visible as columns instead)

---

## 2. Current Architecture Analysis

### 2.1 Data Flow (Current)

```
OrderContext (orders) + TableContext (tables)
         ↓
DashboardPage.jsx
         ↓
┌─────────────────────────────────────────────────────────────┐
│  tables memo: Groups by sectionName (restaurant areas)      │
│    - Default, out, in, Walk-In, etc.                       │
│    - Each section has tables array                          │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│  gridItems memo: Combines based on activeChannels           │
│    - dineIn → allTablesList                                │
│    - takeAway → takeAwayOrders                             │
│    - delivery → deliveryOrders                              │
│    - room → allRoomsList                                    │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│  Rendering (Two modes):                                     │
│                                                             │
│  Table View (showGridView):                                 │
│    - If isDineInOnly && hasAreas → TableSection per area    │
│    - Else → Unified grid with TableCards                    │
│                                                             │
│  List View (showListView):                                  │
│    - columnCount: 4 CSS columns                             │
│    - OrderCards mixed from all channels                     │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Key Files & Their Roles

| File | Role | Lines of Code | Impact |
|------|------|---------------|--------|
| `DashboardPage.jsx` | Main orchestrator | ~1003 | 🔴 HIGH |
| `Header.jsx` | Channel filters, view toggle | ~595 | 🟡 MEDIUM |
| `TableSection.jsx` | Area-based section render | ~62 | 🔴 REMOVE/REPLACE |
| `TableCard.jsx` | Individual table card | ~315 | 🟢 NO CHANGE |
| `OrderCard.jsx` | Individual order card | ~625 | 🟢 NO CHANGE |

### 2.3 Current State Variables

```javascript
// DashboardPage.jsx - Line 167
const [activeChannels, setActiveChannels] = useState(["delivery", "takeAway", "dineIn", "room"]);

// Line 170
const [activeView, setActiveView] = useState("table"); // "table" | "order"

// Line 171
const [activeFirst, setActiveFirst] = useState(true); // Active orders first toggle
```

### 2.4 Current Rendering Logic

**Table View (Line 774-836):**
```javascript
{showGridView && (
  isDineInOnly && hasAreas && !activeFirst ? (
    // Area-based sections with TableSection components
    <div className="flex gap-8 overflow-x-auto">
      {Object.entries(tables).map(([key, section], index) => (
        <TableSection section={section} ... />
      ))}
    </div>
  ) : (
    // Unified grid - single grid with all items
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, 160px)' }}>
      {filteredGridItems.map((item) => <TableCard ... />)}
    </div>
  )
)}
```

**List View (Line 839-953):**
```javascript
{showListView && (
  <div style={{ columnCount: 4, columnGap: '8px' }}>
    {/* Mixed orders from all channels */}
    {activeChannels.includes("dineIn") && allTablesList.map(...)}
    {activeChannels.includes("delivery") && deliveryOrders.map(...)}
    {activeChannels.includes("takeAway") && takeAwayOrders.map(...)}
  </div>
)}
```

---

## 3. Target Architecture

### 3.1 New Data Flow

```
OrderContext + TableContext
         ↓
DashboardPage.jsx
         ↓
┌─────────────────────────────────────────────────────────────┐
│  channelData memo: Group by channel (NOT area)              │
│    {                                                        │
│      dineIn: { items: [...tables, ...walkIns], count: N }  │
│      takeAway: { items: [...orders], count: N }            │
│      delivery: { items: [...orders], count: N }            │
│      room: { items: [...rooms], count: N }                 │
│    }                                                        │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│  ChannelColumnsLayout (New Component)                       │
│    - Manages column widths state                            │
│    - Handles resize drag events                             │
│    - Persists to localStorage                               │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│  ChannelColumn (New Component) × 4                          │
│    - Header with channel name + count                       │
│    - Collapse button                                        │
│    - Scrollable content area                                │
│    - Renders TableCard (table view) or OrderCard (list)     │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 New Layout Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Header (channels removed, view toggle remains)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌─────────────┐│┌─────────────┐│┌─────────────┐│┌─────────────┐           │
│ │  Dine-In    │││  TakeAway   │││  Delivery   │││    Room     │           │
│ │  (8 items)  │││  (3 items)  │││  (0 items)  │││  (2 items)  │           │
│ ├─────────────┤│├─────────────┤│├─────────────┤│├─────────────┤           │
│ │ ┌─────────┐ │││ ┌─────────┐ │││             │││ ┌─────────┐ │           │
│ │ │  Card   │ │││ │  Card   │ │││  No orders  │││ │  Card   │ │           │
│ │ └─────────┘ │││ └─────────┘ │││             │││ └─────────┘ │           │
│ │ ┌─────────┐ │││ ┌─────────┐ │││             │││ ┌─────────┐ │           │
│ │ │  Card   │ │││ │  Card   │ │││             │││ │  Card   │ │           │
│ │ └─────────┘ │││ └─────────┘ │││             │││ └─────────┘ │           │
│ │    ...      │││             │││             │││             │           │
│ │ (scroll)    │││             │││             │││             │           │
│ └─────────────┘│└─────────────┘│└─────────────┘│└─────────────┘           │
│       ↕              ↕              ↕                                      │
│   Resize Handle  Resize Handle  Resize Handle                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 New State Structure

```javascript
// New state for column widths (percentages, sum = 100)
const [channelWidths, setChannelWidths] = useLocalStorage('channelWidths', {
  dineIn: 25,
  takeAway: 25,
  delivery: 25,
  room: 25,
});

// Collapsed channels
const [collapsedChannels, setCollapsedChannels] = useLocalStorage('collapsedChannels', []);

// REMOVED: activeChannels (no longer needed - all channels visible as columns)
```

---

## 4. Changes Required

### 4.1 Files to CREATE

| File | Purpose |
|------|---------|
| `/components/dashboard/ChannelColumnsLayout.jsx` | Main layout container with resize logic |
| `/components/dashboard/ChannelColumn.jsx` | Single channel column component |
| `/components/dashboard/ResizeHandle.jsx` | Draggable resize handle |
| `/hooks/useLocalStorage.js` | localStorage hook (if not exists) |
| `/hooks/useResizable.js` | Resize drag logic hook |

### 4.2 Files to MODIFY

| File | Changes |
|------|---------|
| `DashboardPage.jsx` | Replace area-based rendering with ChannelColumnsLayout |
| `Header.jsx` | Remove channel filter buttons (keep view toggle, search, status filters) |

### 4.3 Files to REMOVE/DEPRECATE

| File | Reason |
|------|--------|
| `TableSection.jsx` | Area-based grouping no longer needed |

---

## 4A. API to UI Data Mapping (Complete Flow)

### 4A.1 Table Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ BACKEND API: GET /api/v1/all-table-list                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ Response: [                                                                 │
│   {                                                                         │
│     "id": 123,                                                              │
│     "table_no": "1",                                                        │
│     "title": "Default",        ← This is the SECTION/AREA name             │
│     "rtype": "TB" | "RM",      ← Table or Room                             │
│     "status": 1,               ← Active/Inactive                            │
│     "engage": 0 | 1,           ← Occupied or not                           │
│     "restaurant_id": 509,                                                   │
│     ...                                                                     │
│   }                                                                         │
│ ]                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ TRANSFORM: tableTransform.js → fromAPI.table()                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ Maps:                                                                       │
│   api.id          → tableId                                                │
│   api.table_no    → tableNumber                                            │
│   api.title       → sectionName   ← AREA NAME ("Default", "out", "in")     │
│   api.rtype       → tableType (TB/RM), isRoom                              │
│   api.status      → isActive                                               │
│   api.engage      → isOccupied, status                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ CONTEXT: TableContext.jsx                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ Stores transformed tables in state:                                         │
│   tables = [{ tableId, sectionName, status, isRoom, ... }, ...]            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ DASHBOARD: DashboardPage.jsx (Line 229-266)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ CURRENT: Groups tables by sectionName (area-based)                         │
│                                                                             │
│   const hasSections = tables.some(t => t.sectionName);                     │
│   if (hasSections) {                                                       │
│     tables.forEach(t => {                                                  │
│       const section = t.sectionName || 'Default';                          │
│       grouped[section].push(t);                                            │
│     });                                                                     │
│   }                                                                         │
│                                                                             │
│ NEW: Will group by CHANNEL instead (dineIn, takeAway, delivery, room)      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4A.2 API Field Mapping Reference

| API Field | Transform | Frontend Field | Used For |
|-----------|-----------|----------------|----------|
| `id` | Direct | `tableId` | Unique identifier |
| `table_no` | Direct | `tableNumber` | Display "T1", "T2" |
| `title` | Direct | `sectionName` | **AREA GROUPING** (currently) |
| `rtype` | Map TB/RM | `tableType`, `isRoom` | Distinguish tables vs rooms |
| `status` | toBoolean | `isActive` | Show/hide disabled tables |
| `engage` | toBoolean | `isOccupied` | Table status (available/occupied) |
| `waiter_id` | Direct | `assignedWaiterId` | Waiter assignment |

### 4A.3 Order Data Flow (TakeAway, Delivery, Walk-In)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ BACKEND API: GET /api/v2/employee-orders-list                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ Response includes order_type field:                                         │
│   "order_type": "Dine In" | "Take Away" | "Delivery" | "Room" | "Walk In"  │
│   "f_order_status": 1-9 (order status)                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ TRANSFORM: orderTransform.js → fromAPI.order()                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ Maps:                                                                       │
│   api.order_type  → orderType ('dineIn'|'takeAway'|'delivery'|'room')     │
│   api.table_id    → tableId (0 for non-dineIn)                             │
│   api.f_order_status → fOrderStatus, status                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ CONTEXT: OrderContext.jsx                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ Provides filtered order arrays:                                             │
│   - dineInOrders (tableId > 0, orderType = dineIn)                         │
│   - takeAwayOrders (orderType = takeAway)                                  │
│   - deliveryOrders (orderType = delivery)                                  │
│   - walkInOrders (orderType = walkIn, tableId = 0)                         │
│   - roomOrders (orderType = room)                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4A.4 Channel Source Mapping

| Channel | Data Source | From Context |
|---------|-------------|--------------|
| **Dine-In** | Tables + Walk-In Orders | `useTables().tables` (non-room) + `useOrders().walkInOrders` |
| **TakeAway** | TakeAway Orders | `useOrders().takeAwayOrders` |
| **Delivery** | Delivery Orders | `useOrders().deliveryOrders` |
| **Room** | Room Tables | `useTables().tables` (isRoom=true) |

### 4A.5 What Changes in New Layout

| Current | New |
|---------|-----|
| Group by `sectionName` (api.title) | Group by `channel` (orderType/isRoom) |
| Sections: Default, out, in, Walk-In | Columns: Dine-In, TakeAway, Delivery, Room |
| TableSection component per area | ChannelColumn component per channel |
| activeChannels filters data | All channels visible as columns |

---

## 5. Detailed Component Specifications

### 5.1 ChannelColumnsLayout

```jsx
// Props
interface ChannelColumnsLayoutProps {
  channels: Array<{
    id: string;          // 'dineIn' | 'takeAway' | 'delivery' | 'room'
    name: string;        // Display name
    items: Array<any>;   // Tables or Orders
    enabled: boolean;    // From restaurant features
  }>;
  viewType: 'table' | 'order';
  activeFirst: boolean;
  renderCard: (item: any, channel: string) => ReactNode;
  onItemClick: (item: any) => void;
}

// Internal State
const [widths, setWidths] = useLocalStorage('channelWidths', defaultWidths);
const [collapsed, setCollapsed] = useLocalStorage('collapsedChannels', []);
```

### 5.2 ChannelColumn

```jsx
// Props
interface ChannelColumnProps {
  channel: {
    id: string;
    name: string;
    items: Array<any>;
  };
  width: number;           // Percentage
  isCollapsed: boolean;
  activeFirst: boolean;
  onCollapse: () => void;
  renderCard: (item: any) => ReactNode;
  minWidth: number;        // Minimum pixel width (e.g., 150)
}
```

### 5.3 ResizeHandle

```jsx
// Props
interface ResizeHandleProps {
  onDrag: (deltaX: number) => void;
  onDragEnd: () => void;
}
```

---

## 6. Risk Assessment

### 6.1 High Risk Items

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| 1 | **Breaking existing functionality** | User can't see orders | Keep old code in separate branch, thorough testing |
| 2 | **Area data lost** | Dine-In tables lose area grouping | Area info still in data, just not displayed as sections |
| 3 | **Header changes break search** | Search stops working | Keep search unchanged, only remove channel buttons |
| 4 | **Performance with many orders** | UI lag | Virtual scrolling within columns |

### 6.2 Medium Risk Items

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| 5 | **Resize edge cases** | Columns too small/large | Enforce min/max widths |
| 6 | **localStorage corruption** | Invalid state | Validate on load, fallback to defaults |
| 7 | **Active orders toggle interaction** | Sorting breaks | Sort within each column independently |
| 8 | **Room channel special handling** | Rooms don't show properly | Keep room logic intact, just move to column |

### 6.3 Low Risk Items

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| 9 | **CSS conflicts** | Layout breaks | Scoped CSS classes |
| 10 | **Context dependency issues** | Data not available | Keep context usage unchanged |

---

## 7. Migration Strategy

### Phase 1: Create New Components (No Breaking Changes)
1. Create `ChannelColumnsLayout.jsx`
2. Create `ChannelColumn.jsx`
3. Create `ResizeHandle.jsx`
4. Create `useResizable.js` hook
5. Unit test each component in isolation

### Phase 2: Add Feature Flag
```javascript
const USE_CHANNEL_LAYOUT = true; // Feature flag
```

### Phase 3: Integrate with Feature Flag
```jsx
{USE_CHANNEL_LAYOUT ? (
  <ChannelColumnsLayout ... />
) : (
  // Existing area-based code
)}
```

### Phase 4: Header Modification
1. Remove channel filter buttons when `USE_CHANNEL_LAYOUT = true`
2. Keep: View toggle, Search, Status filters, Add order button

### Phase 5: Testing & Rollout
1. Test all scenarios
2. Remove feature flag
3. Remove deprecated code

---

## 8. Testing Checklist

### 8.1 Functional Tests

- [ ] All 4 channels visible as columns
- [ ] Table View shows TableCards in each column
- [ ] List View shows OrderCards in each column
- [ ] Columns are resizable via drag
- [ ] Columns can be collapsed
- [ ] Column widths persist after refresh
- [ ] Collapsed state persists after refresh
- [ ] Active orders toggle sorts within each column
- [ ] Search works across all columns
- [ ] Status filters work across all columns
- [ ] Click on card opens OrderEntry
- [ ] Empty channel shows "No orders" message
- [ ] Restaurant features hide unavailable channels

### 8.2 Edge Cases

- [ ] All channels empty
- [ ] Single channel with 100+ orders
- [ ] All channels collapsed
- [ ] Column resized to minimum width
- [ ] localStorage cleared/corrupted
- [ ] Window resize behavior

### 8.3 Regression Tests

- [ ] Order placement still works
- [ ] Ready/Serve buttons work
- [ ] Cancel order works
- [ ] Bill payment works
- [ ] Socket updates reflect correctly
- [ ] Search results highlight correctly

---

## 9. Rollback Plan

If critical issues found:
1. Revert to previous commit
2. Or set `USE_CHANNEL_LAYOUT = false` (feature flag)
3. Communicate to user

---

## 10. Success Criteria

1. ✅ Channel-based columns visible for all enabled channels
2. ✅ Columns are resizable
3. ✅ Widths persist in localStorage
4. ✅ Same layout for Table View and List View
5. ✅ Channel filter buttons removed from Header
6. ✅ All existing functionality preserved
7. ✅ No performance degradation

---

## 11. Open Questions

1. **Should collapsed columns show just the header, or be completely hidden?**
   - Recommendation: Show header with expand button

2. **What should be the minimum column width?**
   - Recommendation: 150px (enough for 1 card + padding)

3. **Should we support keyboard shortcuts for collapse/expand?**
   - Recommendation: Future enhancement, not for initial release

---

## 12. Appendix

### A. Current File Structure
```
/app/frontend/src/
├── components/
│   ├── cards/
│   │   ├── TableCard.jsx       # Keep unchanged
│   │   └── OrderCard.jsx       # Keep unchanged
│   ├── sections/
│   │   └── TableSection.jsx    # DEPRECATE
│   ├── layout/
│   │   └── Header.jsx          # MODIFY (remove channel filters)
│   └── dashboard/              # NEW FOLDER
│       ├── ChannelColumnsLayout.jsx
│       ├── ChannelColumn.jsx
│       └── ResizeHandle.jsx
├── hooks/
│   ├── useLocalStorage.js      # NEW (if not exists)
│   └── useResizable.js         # NEW
└── pages/
    └── DashboardPage.jsx       # MAJOR MODIFY
```

### B. Key Dependencies
- React 19
- Tailwind CSS
- No additional libraries needed

---

**Document End**
