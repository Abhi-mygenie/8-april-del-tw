# MyGenie Restaurant POS System - PRD

## Original Problem Statement
1. Pull code from https://github.com/Abhi-mygenie/8-april-del-tw.git main branch (public repo)
2. Run and build as-is - React app, no backend
3. Add environment variables:
   - REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
   - REACT_APP_SOCKET_URL=https://presocket.mygenie.online

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
- [x] Configured environment variables for API and Socket connections
- [x] App running successfully with login page displaying

### Jan 7, 2026 - OrderCard UI Redesign
- [x] Header: Added order type label (Dine In/Take Away/Delivery)
- [x] Header: Show customer name instead of waiter
- [x] Header: Snooze button only for Yet to Confirm orders
- [x] Items: Removed item-level cancel [X] buttons
- [x] Items: Removed item-level Ready/Serve buttons
- [x] Items: Simplified to `● name (qty)` display
- [x] Footer: 44px minimum touch targets for tablet compatibility
- [x] Footer: Dynamic buttons by fOrderStatus (unchanged - already correct)

## Core Features (from existing codebase)
- Restaurant POS system interface
- User authentication (login/forgot password)
- Table management with real-time socket updates
- Order taking with cart, customizations, addons
- Payment collection (cash, card, UPI)
- Kitchen Display System (KDS) integration

## Key Documents
- `/app/memory/ARCHITECTURE.md` - System architecture
- `/app/memory/API_DOCUMENT_V2.md` - API reference
- `/app/memory/BUGS.md` - Bug tracker
- `/app/memory/ORDERCARD_SUGGESTIONS.md` - OrderCard design spec

## P0/P1/P2 Features Remaining
- P1: Test OrderCard on tablet device
- P1: Implement onAccept/onReject handlers for Yet to Confirm flow
- P2: Phase 2 polish items from ORDERCARD_SUGGESTIONS.md

## Next Tasks
- Test all order status flows with real credentials
- Verify 4 cards fit per row on tablet (280px min-width)
- Test touch targets on actual tablet device
