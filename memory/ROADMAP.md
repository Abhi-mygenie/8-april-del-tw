# Roadmap

## P0 — Must Fix Now

### 1. Fix `enabledChannels` ReferenceError Crash
- **What:** Intermittent crash "Cannot access 'enabledChannels' before initialization"
- **Why:** User sees error screen on login sometimes
- **Root cause:** `useEffect` dependency on `enabledChannels` may have ordering issues, or browser caching stale JS
- **Fix:** Verify hook ordering in `ChannelColumnsLayout.jsx`, force clean rebuild

### 2. Fix Grey Space — Switch to Flex-Proportional Sizing
- **What:** Grey space appears on the right when cards don't perfectly fill the container width
- **Why:** Channel container uses fixed pixel width (`width: ${px}px, flex-shrink: 0`)
- **Root cause:** Pixel-based width model inherently leaves remainders
- **Fix:** Replace fixed pixel widths in `ChannelColumn.jsx` with `flex: maxColumns`. Keep grid inside using `repeat(auto-fill, 160px)` for table cards. Cards stay 160px, container fills available space.
- **Impact:** Eliminates grey space for all screen sizes. No change to card components.

### 3. Verify Smart Defaults on Various Screen Sizes
- **What:** Smart default calculation may produce different results on different screens
- **Test on:** 1440px (MacBook), 1920px (Full HD), 1280px (smaller laptops)

---

## P1 — Important, After P0

### 4. Phase B: Drag-to-Resize
- **What:** ResizeHandle between channels allows drag to resize
- **Status:** Component exists but non-functional (drag events fire, UI doesn't update properly)
- **Approach:** With flex model, drag changes the flex ratios between adjacent channels
- **Files:** `ResizeHandle.jsx`, `ChannelColumnsLayout.jsx`

### 5. Remove Channel Filter Buttons from Header
- **What:** Header still shows All/Del/Take/Dine/Room filter buttons
- **Why:** Redundant — channels are now visible as columns
- **File:** `/app/frontend/src/components/layout/Header.jsx`
- **Guard:** Only hide when `USE_CHANNEL_LAYOUT = true`

### 6. Search & Status Filter Verification
- **What:** Verify search and status filters (Confirm/Cooking/Ready/Running/Schedule) work within the new channel layout
- **File:** `ChannelColumnsLayout.jsx` — matchingIds prop already passed

---

## P2 — Future / Backlog

### 7. Clean Up Deprecated Code
- Remove `TableSection.jsx` and old area-grouping logic from `DashboardPage.jsx`
- Remove feature flag once channel layout is fully approved
- Delete `useLocalStorage.js` if unused elsewhere

### 8. Implement `clear_payment` Functionality
- Currently ignored by user request, but noted in original codebase

### 9. Implement `serve` Button API Integration
- Serve button exists in UI but needs backend API wiring

### 10. Fix Backend Table Socket Bug
- Backend doesn't emit `update_table` socket events when `update-food-status` is triggered
- Frontend workaround (table lock during fetch) currently in place
- Proper fix requires backend changes

---

## Lessons Learned (for future agents)

1. **Arrow behavior:** User wants INDEPENDENT channel control. `<` = decrease self, `>` = increase self. NO coupling to adjacent channels.
2. **No localStorage for layout:** User explicitly wants fresh defaults on every login.
3. **View-type defaults:** Table view = 2 cols default, Order view = 1 col default.
4. **Smart defaults:** Measure container width, count visible channels, divide equally. Calculate `floor(availablePerChannel / cardUnit)`.
5. **Pixel-based widths cause grey space.** Use flex-proportional model instead.
6. **Don't overcomplicate:** Each feature should be independently testable. Arrow logic, smart defaults, and flex sizing are separate concerns.
