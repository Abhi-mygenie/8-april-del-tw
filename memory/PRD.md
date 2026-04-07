# MyGenie Restaurant POS System - PRD

## Original Problem Statement
1. Pull code from https://github.com/Abhi-mygenie/8-april-del-tw.git main branch
2. Run and build as-is - React app, no backend
3. Add environment variables for API and Socket connections

## Architecture
- **Frontend**: React 19 with CRACO build setup
- **UI Framework**: Radix UI components + Tailwind CSS
- **State Management**: React Context (Auth, Socket, Restaurant, Menu, Table, Order)
- **API Communication**: Axios + Socket.io client
- **External APIs**: Connects to preprod.mygenie.online backend

## What's Been Implemented

### Jan 7, 2026 - Initial Setup
- [x] Cloned repository from GitHub
- [x] Set up React frontend with all dependencies
- [x] Configured environment variables

### Jan 7, 2026 - OrderCard UI Redesign (Round 1)
- Initial implementation based on ORDERCARD_SUGGESTIONS.md

### Jan 7, 2026 - OrderCard UI Fixes (Round 2) 
Based on user feedback with screenshots:
- [x] Logo: Fixed broken image → "MG" text in green circle
- [x] Header: Added colored backgrounds (Yellow/Green/Pink/Blue by order type)
- [x] Items: RE-ADDED item-level Ready/Serve buttons
- [x] Header: Added order-level cancel [X] button
- [x] New props: onCancelOrder, onItemStatusChange

## OrderCard Final Structure
```
┌─────────────────────────────────────────────────────────────┐
│ [COLORED HEADER - Yellow/Green/Pink/Blue]                   │
│ [MG] OrderType  Customer · Time         ₹Amount  [Snooze][X]│
├─────────────────────────────────────────────────────────────┤
│ ● Item Name (qty)                              [Ready/Serve]│
│ ● Item Name (qty)                              [Ready/Serve]│
├─────────────────────────────────────────────────────────────┤
│ ▼ Served (count) - collapsible                              │
├─────────────────────────────────────────────────────────────┤
│ [🖨️ KOT]                              [Ready/Serve/Bill]    │
└─────────────────────────────────────────────────────────────┘
```

## Key Documents
- `/app/memory/ARCHITECTURE.md` - System architecture
- `/app/memory/API_DOCUMENT_V2.md` - API reference
- `/app/memory/BUGS.md` - Bug tracker
- `/app/memory/ORDERCARD_SUGGESTIONS.md` - Original design spec (partially revised)

## P0/P1/P2 Features Remaining
- P0: Wire up onCancelOrder handler in DashboardPage
- P0: Wire up onItemStatusChange handler for item-level actions
- P1: Test all order types on tablet
- P2: Additional polish items

## Next Tasks
- Connect item-level buttons to actual API calls
- Connect order-level cancel to CancelOrderModal
- Test on real device with live data
