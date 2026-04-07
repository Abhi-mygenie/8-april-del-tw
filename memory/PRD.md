# MyGenie Restaurant POS System - PRD

## Original Problem Statement
Pull code from https://github.com/Abhi-mygenie/8-april-del-tw.git default branch (v2). Run and build as-is React app (no backend). Add env variables for API and Socket URLs.

## Tech Stack
- React 19 with CRACO
- Tailwind CSS
- Radix UI components
- Socket.io client
- React Router DOM

## What's Been Implemented (Jan 2026)
- ✅ Cloned repository from GitHub (v2 branch)
- ✅ Installed all dependencies with yarn
- ✅ Configured environment variables:
  - REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
  - REACT_APP_SOCKET_URL=https://presocket.mygenie.online
- ✅ App running successfully on port 3000

## Environment Configuration
Frontend .env:
- REACT_APP_API_BASE_URL=https://preprod.mygenie.online/
- REACT_APP_SOCKET_URL=https://presocket.mygenie.online

## Current Status
App is running and displaying login page for MyGenie Restaurant POS System.

---

## Channel-Based Layout Redesign (April 7, 2026)

### Status: PLANNING (Document Created)

### Key Decisions:
1. Replace area-based grouping (Default, out, in, Walk-In) with **channel-based columns** (Dine-In, TakeAway, Delivery, Room)
2. Each channel = 1 column with single-card width
3. Columns resizable via drag separator
4. Columns can be fully collapsed
5. Widths persist to localStorage
6. **Channel filter buttons REMOVED** from Header (channels are now visible as columns)
7. Same layout applies to BOTH Table View and List View

### Documentation:
- Full specification: `/app/docs/CHANNEL_BASED_LAYOUT_REDESIGN.md`

### Identified Risks:
- Breaking existing area-based functionality
- Header channel filter removal
- Active orders toggle interaction
- Performance with many orders

### Migration Strategy:
- Feature flag approach for safe rollout
- Keep old code until new layout is verified

