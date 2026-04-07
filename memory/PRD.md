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

## Current Status (Apr 7, 2026)

### What's Working
- Phase A (Arrow Functionality) — arrows work independently per channel, tested 100% pass rate
- Smart default calculation — measures container, distributes width among visible channels
- View-type aware defaults — table view starts at 2 cols, order view at 1 col (static fallback)
- Feature flag toggle between old area-based and new channel-based layout

### Known Issues (Active)
1. **`enabledChannels` ReferenceError** — intermittent crash "Cannot access 'enabledChannels' before initialization". Root cause: useEffect ordering or cached JS bundle.
2. **Grey space on right** — channel container uses fixed pixel width (`flex-shrink: 0`). When cards don't perfectly divide container width, leftover pixels appear as grey space. Root cause: pixel-based width model.
3. **Fix required:** Switch from fixed pixel widths to flex-proportional container sizing. Channels use `flex: maxColumns`, grid inside uses `repeat(auto-fill, 160px)`.

### What's Parked
- Phase B: Drag-to-Resize via ResizeHandle (non-functional, parked)
- Remove channel filter buttons from Header.jsx

## Backlog (P0 → P2)

### P0 (Critical)
- Fix `enabledChannels` crash
- Fix grey space: switch channel containers to flex-proportional sizing
- Verify smart defaults work correctly on all screen sizes

### P1 (Important)
- Phase B: Drag-to-Resize via ResizeHandle between channels
- Remove old channel filter buttons from Header.jsx
- Verify Search & Status filter integration with channel layout

### P2 (Future)
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
