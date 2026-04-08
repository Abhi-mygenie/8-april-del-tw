# MyGenie Restaurant POS System - Session PRD

## Original Problem Statement
1. Pull code from default branch (v5) of https://github.com/Abhi-mygenie/8-april-del-tw.git
2. React frontend 
3. Build as-is
4. Environment variables:
   - REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
   - REACT_APP_SOCKET_URL=https://presocket.mygenie.online

## Architecture
- **Frontend**: React 19 with CRACO, Tailwind CSS, Radix UI components
- **Backend**: External API (preprod.mygenie.online)
- **Socket**: External socket server (presocket.mygenie.online)

## Environment Configuration
```
REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
REACT_APP_SOCKET_URL=https://presocket.mygenie.online
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
```

## Tech Stack
- React 19.0.0
- CRACO 7.1.0
- Tailwind CSS 3.4.17
- Radix UI Components
- Socket.io Client 4.7.0
- React Router DOM 7.5.1
- Recharts 3.6.0 (charts)

---

## What's Been Implemented (April 8, 2026)

### Initial Setup ✅
- [x] Cloned repository from GitHub (branch: v5)
- [x] Set up React frontend with required environment variables
- [x] Installed all dependencies via yarn
- [x] Frontend running successfully on port 3000

### Dashboard Dual-View System ✅
- [x] **Feature Flag**: `USE_STATUS_VIEW` added to `featureFlags.js`
- [x] **Constants**: Added `STATUS_COLUMNS` and `fOrderStatus: 10 (reserved)` to `constants.js`
- [x] **State Management**: Added `dashboardView`, `hiddenChannels`, `hiddenStatuses` states
- [x] **Data Layer**: Added `statusData` memo that groups orders by fOrderStatus
- [x] **Filter Swap Logic**:
  - Channel View → Shows 9 Status filters (YTC, Preparing, Ready, Running, Served, Pending Pay, Paid, Cancelled, Reserved)
  - Status View → Shows 4 Channel filters (Del, Take, Dine, Room)
- [x] **Toggle Buttons**: Added Channel/Status view toggles in Header
- [x] **Hide Column Feature**: Hide link on each column, linked to filter hiding
- [x] **Restore Button**: "Show Hidden (N)" button to restore all hidden items
- [x] **Removed**: Static "All/Del/Take/Dine/Room" channel pills from Header

### Food Transfer Fix ✅
- [x] Wired `onFoodTransfer` prop through DashboardPage → ChannelColumnsLayout → ChannelColumn → OrderCard
- [x] Food transfer icon now correctly opens transfer modal

---

## Files Modified

| File | Changes |
|------|---------|
| `featureFlags.js` | Added `USE_STATUS_VIEW` flag |
| `constants.js` | Added `STATUS_COLUMNS`, `fOrderStatus: 10`, `ORDER_TO_TABLE_STATUS.reserved` |
| `DashboardPage.jsx` | Added `dashboardView`, `hiddenChannels`, `hiddenStatuses` states, `statusData` memo, updated Header/Layout props |
| `Header.jsx` | Rewrote filter section (swap logic), added restore button, removed static channel pills, added view toggle buttons |
| `ChannelColumnsLayout.jsx` | Added `onHideColumn`, `onFoodTransfer` props |
| `ChannelColumn.jsx` | Added "Hide" link, `onHideColumn`, `onFoodTransfer` props |

---

## Documentation Updated

| Document | Changes |
|----------|---------|
| `ROADMAP.md` | Marked items #1, #3, #6 as complete. Updated lessons learned. |
| `ARCHITECTURE.md` | Added "Dashboard Dual-View System" section (9.4) |
| `PRD.md` | Updated status, marked View 2 and Hide Feature as implemented |

---

## Test Credentials
- Email: `owner@18march.com`
- Password: `Qplazm@10`

---

## Next Tasks (from Roadmap)

### P0 — Critical
- Add `setTableEngaged` to `handleItemStatusChange` (item-level spinner)

### P1 — Important
- Fix `handleTableClick` type mismatch
- Remove BUG-216 free→engage workaround

### P2 — Backlog
- Wire `onMergeOrder`/`onTableShift`
- Clean up deprecated code
- Drag-to-Resize feature
