# Channel-Based Layout Redesign - Technical Specification

## Document Version: 2.0
## Date: April 7, 2026
## Status: IN PROGRESS (Phase A Complete, Flex Sizing Pending)

---

## 1. Executive Summary

### Current State
The dashboard uses a **channel-based column layout** (behind feature flag `USE_CHANNEL_LAYOUT = true`). Each channel (Dine-In, TakeAway, Delivery, Room) is an independent column with arrow buttons to resize.

### What's Working
- 4 channel columns render with headers, order counts, and arrow buttons
- `<` decreases column count (min 1), `>` increases (no max)
- Each channel is INDEPENDENT — no coupling between channels
- Smart defaults: measures container, distributes width among visible channels
- View-type defaults: table=2 cols, order=1 col
- Layout resets on every login (no persistence)
- 0 orders = channel auto-hides
- Horizontal scroll when expanded beyond viewport

### What's Broken
- **Grey space:** Channel uses fixed pixel widths. Cards don't perfectly divide container → leftover grey pixels.
- **enabledChannels crash:** Intermittent ReferenceError on some logins.

### Required Fix
Switch from fixed pixel widths to **flex-proportional sizing**. Channel container uses `flex: maxColumns`, grid inside uses `repeat(auto-fill, 160px)`.

---

## 2. Architecture

### 2.1 Data Flow

```
OrderContext + TableContext
         ↓
DashboardPage.jsx
         ↓
┌─────────────────────────────────────────────────────────────┐
│  channelData memo: Group by channel                         │
│    {                                                        │
│      dineIn: { items: [...tables, ...walkIns], count: N }  │
│      takeAway: { items: [...orders], count: N }            │
│      delivery: { items: [...orders], count: N }            │
│      room: { items: [...rooms], count: N }                 │
│    }                                                        │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│  ChannelColumnsLayout                                       │
│    - maxColumns state (per-channel, useState)               │
│    - Smart default calculation (container measurement)      │
│    - Arrow handlers (independent per channel)               │
│    - Renders ChannelColumn + ResizeHandle (between cols)    │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│  ChannelColumn × N (visible channels only)                  │
│    - Header: < ChannelName count >                          │
│    - Grid: repeat(actualColumns, 160px) for table view      │
│            repeat(actualColumns, 1fr) for order view        │
│    - Renders TableCard or OrderCard per item                │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 State Model

```javascript
// ChannelColumnsLayout internal state
const [maxColumns, setMaxColumns] = useState(() => getDefaultMaxColumns(viewType));
// { dineIn: 2, takeAway: 2, delivery: 2, room: 2 } for table view
// { dineIn: 1, takeAway: 1, delivery: 1, room: 1 } for order view

// actualColumns = min(channel.items.length, maxColumns[channelId])
// 0 items → 0 actual columns → channel hidden
```

### 2.3 Arrow Behavior (FINAL — 3rd iteration)

| Arrow | Action | Min | Max | Affects Others? |
|-------|--------|-----|-----|-----------------|
| `<` | Decrease this channel by 1 | 1 | — | NO |
| `>` | Increase this channel by 1 | — | None | NO |

### 2.4 Smart Default Calculation

```
On mount / viewType change:
1. Measure containerRef.clientWidth
2. Count visible channels (items.length > 0)
3. cardUnit = table ? 172 : 312
4. available = container - (handles × 24) - (channels × 24 padding)
5. perChannel = available / visibleCount
6. cols = max(1, floor(perChannel / cardUnit))
7. Set all channels to cols
```

### 2.5 Width Calculation (Current — Pixel-Based)

```javascript
// ChannelColumn.jsx
const columnWidth = (actualColumns * cardWidth) + ((actualColumns - 1) * GAP) + PADDING;
// Applied as: width: ${columnWidth}px, minWidth: ${columnWidth}px, flex-shrink: 0
```

**Problem:** This fixed width doesn't fill available space. Leaves grey gaps.

### 2.6 Width Calculation (Target — Flex-Based)

```javascript
// ChannelColumn.jsx — PROPOSED
style={{ flex: maxColumns, minWidth: 0 }}
// Grid inside: repeat(auto-fill, 160px) for table view
```

**Benefit:** Channels fill 100% of container proportionally. No grey space ever.

---

## 3. Files

| File | Role | Status |
|------|------|--------|
| `ChannelColumnsLayout.jsx` | Main container, state, arrows, smart defaults | ACTIVE |
| `ChannelColumn.jsx` | Individual column, header, grid | ACTIVE |
| `ResizeHandle.jsx` | Drag handle between columns | PARKED (Phase B) |
| `featureFlags.js` | `USE_CHANNEL_LAYOUT = true` | ACTIVE |
| `DashboardPage.jsx` | Orchestrator, channelData memo | ACTIVE |

---

## 4. Card Dimensions Reference

| View | Card Width | Card + Gap | Padding/Channel |
|------|-----------|------------|-----------------|
| Table | 160px | 172px (160+12) | 24px (12×2) |
| Order | 300px | 312px (300+12) | 24px (12×2) |
| ResizeHandle | 24px | — | — |

### Fit Calculations (1440px screen, sidebar expanded 280px)

```
Available = 1440 - 280 (sidebar) - 48 (main p-6) - 48 (content p-6) = 1064px

Table view, 1 channel:
  floor((1064 - 24 padding) / 172) = 6 cols → 1044px used, 20px grey

Table view, 4 channels:
  Available per channel = (1064 - 3×24 handles - 4×24 padding) / 4 = 221px
  floor(221 / 172) = 1 col each

Order view, 1 channel:
  floor((1064 - 24) / 312) = 3 cols

Order view, 4 channels:
  floor(221 / 312) = 0 → fallback to 1
```

---

## 5. Known Issues

### ISSUE-001: Grey Space (P0)
- **Symptom:** Grey gap on right side of screen when cards don't perfectly divide width
- **Root cause:** Fixed pixel width on channel container
- **Fix:** Flex-proportional sizing

### ISSUE-002: enabledChannels Crash (P0)
- **Symptom:** "Cannot access 'enabledChannels' before initialization" on some logins
- **Root cause:** Hook ordering issue or stale browser cache
- **Fix:** Verify useEffect/useMemo ordering, force rebuild

### BUG-001: ResizeHandle Drag Not Working (Parked)
- **Symptom:** Drag events fire but UI doesn't update
- **Root cause:** Need to switch to flex model first, then wire drag to flex ratios
- **Status:** Parked until flex sizing is implemented

---

## 6. Testing Results

### Phase A Arrow Tests (Apr 7, 2026) — 100% Pass
| Test | Result |
|------|--------|
| Login & navigate to dashboard | PASS |
| All 4 channels render | PASS |
| Right arrow increases columns (no limit) | PASS |
| Left arrow decreases columns (min 1) | PASS |
| Channel independence (no coupling) | PASS |
| TakeAway arrows independent | PASS |
| Delivery arrows independent | PASS |
| Room arrows independent | PASS |
| Horizontal scroll on expansion | PASS |
| Resize handle exists | PASS |
| Order view arrows work | PASS |
| Layout reset on refresh | PASS |
