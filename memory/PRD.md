# MyGenie Restaurant POS System - PRD

## Original Problem Statement
Pull code from https://github.com/Abhi-mygenie/8-april-del-tw.git default branch (v2). Run and build as-is React app (no backend). Add env variables for API and Socket URLs.

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

## What's Been Implemented

### Initial Setup (Jan 2026)
- Cloned repository from GitHub (v2 branch)
- Installed all dependencies with yarn
- Configured environment variables
- App running successfully on port 3000

### Permission-Based UI (Apr 2026)
- Removed time-window/restaurant setting checks for UI Cancellations; now strictly permission-based
- Added permission checks for `bill` and `print_icon`
- Wired Food Transfer button to navigate to OrderEntry and open modal

### Socket Workaround (Apr 2026)
- Added frontend workaround for missing `update_table` socket event on item status changes

### Channel-Based Layout Redesign (Apr 2026) - COMPLETED Phase A
- Created `USE_CHANNEL_LAYOUT` feature flag (true)
- Built `ChannelColumnsLayout.jsx` — main container for channel-based columns
- Built `ChannelColumn.jsx` — individual channel column with arrows
- Built `ResizeHandle.jsx` — drag handle between columns (Phase B - not wired yet)
- **Arrow Functionality (Phase A) COMPLETE:**
  - `<` (left arrow) = DECREASE this channel's column count (min 1)
  - `>` (right arrow) = INCREASE this channel's column count (no max limit)
  - Each channel is INDEPENDENT — arrows do NOT affect adjacent channels
  - Layout state resets to default (2 columns each) on every mount (no localStorage)
  - Horizontal scroll when total width exceeds viewport
  - 0 orders = channel auto-hides
- Fixed duplicate React key warning for walk-in orders in dineIn channel

## Current Status
- Phase A (Arrow Functionality) — COMPLETE & TESTED (100% pass rate)
- Phase B (Drag-to-Resize) — PARKED
- Feature flag `USE_CHANNEL_LAYOUT = true`

## Backlog (P0 → P2)
### P0
- Phase B: Drag-to-Resize via ResizeHandle between channels
- Remove old channel filter buttons from Header.jsx

### P1
- Verify Search & Status filter integration with channel layout
- Clean up deprecated area-based components (TableSection.jsx) after full approval

### P2
- Implement `clear_payment` functionality
- Implement `serve` button functionality (API integration)
- Fix backend table socket bug (frontend workaround in place)

## Key Architectural Decisions
- Permissions: UI is a "dumb" display layer. No frontend logic for time windows or restaurant settings. Rely on AuthContext permissions array.
- Channel columns: maxColumns controlled per-channel via useState (not localStorage). actualColumns = min(orderCount, maxColumns).
- Feature flag for safe rollout: USE_CHANNEL_LAYOUT toggle in /app/frontend/src/constants/featureFlags.js
