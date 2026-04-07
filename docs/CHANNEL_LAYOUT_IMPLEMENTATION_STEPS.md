# Channel-Based Layout - Step-by-Step Implementation Plan

## Overview
This document outlines the step-by-step implementation approach with feature flag for safe rollout.

---

## Step 1: Create Feature Flag & Utility Hooks
**Files to create:**
- `/app/frontend/src/constants/featureFlags.js`
- `/app/frontend/src/hooks/useLocalStorage.js`

**Tasks:**
1. Create feature flag constant: `USE_CHANNEL_LAYOUT = true`
2. Create `useLocalStorage` hook for persisting column widths

**Testing:**
- Import hook in a test component to verify it works
- No visual changes yet

---

## Step 2: Create ResizeHandle Component
**Files to create:**
- `/app/frontend/src/components/dashboard/ResizeHandle.jsx`

**Tasks:**
1. Create draggable vertical bar component
2. Handle mousedown, mousemove, mouseup events
3. Pass delta to parent via callback
4. Style: 4px wide, cursor: col-resize, hover highlight

**Testing:**
- Can be tested in isolation
- No integration yet

---

## Step 3: Create ChannelColumn Component
**Files to create:**
- `/app/frontend/src/components/dashboard/ChannelColumn.jsx`

**Tasks:**
1. Create column container with header (channel name + count)
2. Add collapse/expand button in header
3. Scrollable content area for cards
4. Accept `renderCard` prop to render TableCard or OrderCard
5. Handle empty state: "No orders" message

**Props:**
```javascript
{
  channelId: string,      // 'dineIn' | 'takeAway' | 'delivery' | 'room'
  channelName: string,    // Display name
  items: Array,           // Tables or Orders
  width: number,          // Percentage width
  minWidth: number,       // Minimum pixel width (150)
  isCollapsed: boolean,
  activeFirst: boolean,   // Sort active orders first
  viewType: 'table' | 'order',
  onCollapse: () => void,
  renderCard: (item) => ReactNode,
  onItemClick: (item) => void,
}
```

**Testing:**
- Render with mock data
- Test collapse/expand
- Test empty state

---

## Step 4: Create ChannelColumnsLayout Component
**Files to create:**
- `/app/frontend/src/components/dashboard/ChannelColumnsLayout.jsx`
- `/app/frontend/src/components/dashboard/index.js` (export all)

**Tasks:**
1. Create container that renders 4 ChannelColumns
2. Place ResizeHandles between columns
3. Manage column widths state (useLocalStorage)
4. Manage collapsed state (useLocalStorage)
5. Handle resize drag: redistribute widths between adjacent columns
6. Enforce minimum widths
7. Pass down all props to ChannelColumns

**Props:**
```javascript
{
  channels: Array<{
    id: string,
    name: string,
    items: Array,
    enabled: boolean,
  }>,
  viewType: 'table' | 'order',
  activeFirst: boolean,
  onItemClick: (item) => void,
  // Card rendering handled internally based on viewType
}
```

**Testing:**
- Render with mock channel data
- Test resize drag
- Test collapse all channels
- Test localStorage persistence

---

## Step 5: Prepare Channel Data in DashboardPage
**Files to modify:**
- `/app/frontend/src/pages/DashboardPage.jsx`

**Tasks:**
1. Add new `channelData` useMemo that groups data by channel:
```javascript
const channelData = useMemo(() => ({
  dineIn: {
    id: 'dineIn',
    name: 'Dine-In',
    items: [...allTablesList.filter(t => !t.isRoom), ...walkInOrders.map(adaptWalkIn)],
    enabled: features.dineIn !== false,
  },
  takeAway: {
    id: 'takeAway',
    name: 'TakeAway',
    items: takeAwayOrders,
    enabled: features.takeaway !== false,
  },
  delivery: {
    id: 'delivery',
    name: 'Delivery',
    items: deliveryOrders,
    enabled: features.delivery !== false,
  },
  room: {
    id: 'room',
    name: 'Room',
    items: allRoomsList,
    enabled: features.room !== false,
  },
}), [allTablesList, allRoomsList, takeAwayOrders, deliveryOrders, walkInOrders, features]);
```

**Testing:**
- Console.log channelData to verify structure
- No visual changes yet

---

## Step 6: Integrate with Feature Flag
**Files to modify:**
- `/app/frontend/src/pages/DashboardPage.jsx`

**Tasks:**
1. Import feature flag and ChannelColumnsLayout
2. Add conditional rendering:
```jsx
import { USE_CHANNEL_LAYOUT } from '../constants/featureFlags';
import { ChannelColumnsLayout } from '../components/dashboard';

// In render:
{USE_CHANNEL_LAYOUT ? (
  <ChannelColumnsLayout
    channels={Object.values(channelData).filter(c => c.enabled)}
    viewType={activeView === 'table' ? 'table' : 'order'}
    activeFirst={activeFirst}
    onItemClick={handleTableClick}
  />
) : (
  // Existing area-based code (keep unchanged)
  {showGridView && (...)}
  {showListView && (...)}
)}
```

**Testing:**
- Toggle feature flag to switch between old/new
- Verify old behavior still works with flag = false
- Test new layout with flag = true

---

## Step 7: Modify Header (Remove Channel Filters)
**Files to modify:**
- `/app/frontend/src/components/layout/Header.jsx`

**Tasks:**
1. Add feature flag check
2. When `USE_CHANNEL_LAYOUT = true`:
   - Hide channel filter buttons (All, Del, Take, Dine, Room)
   - Keep: Search, Status filters, View toggle, Add order button
3. When `USE_CHANNEL_LAYOUT = false`:
   - Keep existing behavior

```jsx
{!USE_CHANNEL_LAYOUT && (
  // Channel filter buttons
  <div className="flex gap-2">
    {channels.map(channel => ...)}
  </div>
)}
```

**Testing:**
- Verify channel buttons hidden when flag = true
- Verify search still works
- Verify status filters still work
- Verify view toggle still works

---

## Step 8: Wire Up Card Interactions
**Files to modify:**
- `/app/frontend/src/components/dashboard/ChannelColumnsLayout.jsx`
- `/app/frontend/src/components/dashboard/ChannelColumn.jsx`

**Tasks:**
1. Pass all necessary handlers to cards:
   - onTableClick / onEdit
   - onMarkReady
   - onMarkServed
   - onBillClick
   - onCancelOrder
   - onItemStatusChange
   - etc.

2. Ensure socket updates reflect correctly in channels

**Testing:**
- Click card → OrderEntry opens
- Ready button works
- Serve button works
- Bill button works
- Cancel works
- Socket updates show immediately

---

## Step 9: Search & Filter Integration
**Files to modify:**
- `/app/frontend/src/components/dashboard/ChannelColumnsLayout.jsx`

**Tasks:**
1. Pass search query and matching IDs to each ChannelColumn
2. Filter items within each column based on search
3. Pass status filter (tableFilter) to filter items

**Testing:**
- Search across all channels
- Status filter (Confirm, Cooking, Ready) works
- Matched items highlighted

---

## Step 10: Final Testing & Cleanup
**Tasks:**
1. Complete all functional tests from checklist
2. Test edge cases
3. Run regression tests
4. Remove console.logs
5. Remove commented old code (optional, can keep for safety)
6. Update documentation

**Testing Checklist:**
- [ ] All 4 channels visible
- [ ] Resize works
- [ ] Collapse works
- [ ] localStorage persists
- [ ] Table View shows TableCards
- [ ] List View shows OrderCards
- [ ] Active orders toggle works
- [ ] Search works
- [ ] Status filters work
- [ ] All card interactions work
- [ ] Socket updates work
- [ ] Empty channel shows message
- [ ] Feature flag toggles correctly

---

## Rollback Steps (If Needed)

1. Set `USE_CHANNEL_LAYOUT = false` in featureFlags.js
2. Restart frontend
3. Old behavior restored immediately

---

## Estimated Timeline

| Step | Duration | Dependencies |
|------|----------|--------------|
| Step 1 | 15 min | None |
| Step 2 | 30 min | Step 1 |
| Step 3 | 1 hour | Step 1 |
| Step 4 | 1.5 hours | Steps 2, 3 |
| Step 5 | 30 min | None |
| Step 6 | 30 min | Steps 4, 5 |
| Step 7 | 30 min | Step 1 |
| Step 8 | 1 hour | Step 6 |
| Step 9 | 30 min | Step 8 |
| Step 10 | 1 hour | All |

**Total: ~7-8 hours**

---

## Ready to Start?

Confirm to proceed with **Step 1: Create Feature Flag & Utility Hooks**
