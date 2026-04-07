# MyGenie Restaurant POS System - PRD

## Original Problem Statement
1. Pull code from https://github.com/Abhi-mygenie/8-april-del-tw.git main branch
2. Run and build as-is - React app, no backend
3. Add environment variables for API and Socket connections

## Architecture
- **Frontend**: React 19 with CRACO build setup
- **UI Framework**: Radix UI + Tailwind CSS
- **State Management**: React Context (Auth, Socket, Restaurant, Menu, Table, Order)
- **API Communication**: Axios + Socket.io client
- **External APIs**: Connects to preprod.mygenie.online backend

## What's Been Implemented

### Jan 7, 2026 - Initial Setup
- [x] Cloned repository from GitHub
- [x] Set up React frontend with all dependencies
- [x] Configured environment variables

### Jan 7, 2026 - OrderCard UI Redesign (Complete)

#### Header Changes
- [x] "MG" text logo in green circle (fixed broken image)
- [x] Colored backgrounds by order type (Yellow/Green/Pink/Blue)
- [x] Table number for Dine-In, order type label for others
- [x] Order-level cancel [X] button
- [x] Snooze button only for Yet to Confirm orders

#### Items Section
- [x] Variants/Addons in orange text below item
- [x] Item notes with icon in gray italic
- [x] Item-level action circles (Dine-In only)
- [x] Combined status + circle as single tappable area
- [x] 44px touch targets for iOS/Android compliance

#### Order Notes
- [x] Order-level notes in yellow background section

#### Footer Section
- [x] Order-level Ready/Serve/Bill for ALL order types
- [x] KOT button always visible
- [x] 44px touch targets

#### Layout Changes
- [x] Unified grid - all order types together (no separation)
- [x] Dynamic card heights based on content
- [x] 280px min-width for 4 cards per row

## OrderCard Final Structure
```
┌─────────────────────────────────────────────────────────────┐
│ [COLORED HEADER - Yellow/Green/Pink/Blue]                   │
│ [MG] [Type?] Name/Table · Time           ₹Amount  [Snz][X]  │
├─────────────────────────────────────────────────────────────┤
│ 📄 Order note (if any)                                      │
├─────────────────────────────────────────────────────────────┤
│ ● Item (qty)                          [Status (○)] DineIn   │
│   Variant: Value, Addon                                     │
│   📄 item note                                              │
├─────────────────────────────────────────────────────────────┤
│ ▼ Served (count)                                            │
├─────────────────────────────────────────────────────────────┤
│ [🖨️ KOT]                              [Ready/Serve/Bill]    │
└─────────────────────────────────────────────────────────────┘
```

## Action Button Logic
| Order Type | Item-Level | Footer (Order-Level) |
|------------|------------|---------------------|
| Dine-In    | ✅ Status + Circle | ✅ KOT + Ready/Serve/Bill |
| Take Away  | ❌ None | ✅ KOT + Ready/Serve/Bill |
| Delivery   | ❌ None | ✅ KOT + Ready/Serve/Bill |

## Key Documents
- `/app/memory/ARCHITECTURE.md`
- `/app/memory/API_DOCUMENT_V2.md`
- `/app/memory/BUGS.md`
- `/app/memory/ORDERCARD_SUGGESTIONS.md`

## P0/P1/P2 Remaining
- P0: Wire up onCancelOrder handler
- P0: Wire up onItemStatusChange handler  
- P1: Add profile setting for card height (dynamic/fixed)
- P1: Test on tablet device
- P2: Add keyboard shortcuts

## Next Tasks
- Connect handlers to actual API calls
- Test all flows with real credentials
