# Core POS Frontend - PRD (Product Requirements Document)

**Last Updated:** April 7, 2026  
**Version:** 2.0

---

## Original Problem Statement
Pull code from branch `7th-april-v1-` of `https://github.com/Abhi-mygenie/core-pos-front-end-.git`, set up React frontend, no database, run as-is without code updates.

---

## Architecture
- **Frontend**: React 19 with Craco, Tailwind CSS, Radix UI components
- **Port**: 3000
- **Backend API**: `https://preprod.mygenie.online/`
- **Socket Server**: `https://presocket.mygenie.online`

---

## What's Been Implemented

### Phase 1: Initial Setup (April 6, 2026)
- Cloned repository from specified branch
- Installed dependencies via yarn
- Configured environment variables

### Phase 2: Table View Visual Overhaul (April 7, 2026)

#### 2.1 Order Type Differentiation - FIXED
**Problem:** All orders (TakeAway, Delivery, Walk-In) were showing as "WC" due to hardcoded `order_type: 'pos'`

**Solution:**
| Change | File | Details |
|--------|------|---------|
| Fixed payload builder | `orderTransform.js` | Use `mapOrderTypeToAPI(orderType)` instead of hardcoded `'pos'` |
| Updated constants | `constants.js` | `TAKE_AWAY: 'takeaway'` (was `'take_away'`) |
| Added normalizer cases | `orderTransform.js` | Handle `'dinein'`, `'takeaway'`, `'delivery'` from API |

**Order Type → API Mapping:**
| User Selection | `order_type` sent to API |
|----------------|--------------------------|
| Dine-In | `"dinein"` |
| TakeAway | `"takeaway"` |
| Delivery | `"delivery"` |

#### 2.2 Header Color by Order Type - IMPLEMENTED
| Order Type | Header Background | Hex Code |
|------------|-------------------|----------|
| Dine-In | Yellow | `#FFF9E6` |
| Walk-In | Yellow | `#FFF9E6` |
| TakeAway | Green | `#C8E6C9` |
| Delivery | Pink | `#FFEBEE` |
| Room | Blue | `#E3F2FD` |

#### 2.3 Border Colors - SIMPLIFIED
- Removed status-based border colors (amber/green/red)
- All cards now use neutral gray border `#E5E5E5`
- Status indicated via inline text + action buttons

#### 2.4 Customer Label by Order Type - FIXED
| Order Type | Default Label (no customer name) |
|------------|----------------------------------|
| Dine-In | Table number |
| Walk-In | `"Walk-In"` |
| TakeAway | `"TA"` |
| Delivery | `"Del"` |

#### 2.5 Inline Status Display - ADDED
Format: `{Waiter} • {Status}`

Example: `Owner • Preparing`

| Status | Color |
|--------|-------|
| Preparing | Orange |
| Ready | Green |
| Served | Green |
| Confirming | Amber |

#### 2.6 Action Buttons - UPDATED
| Status | Bottom Buttons |
|--------|----------------|
| Preparing (1) | `[🖨️ KOT]` + `[Ready]` |
| Ready (2) | `[🖨️ KOT]` + `[Serve]` |
| Served (5) | `[🖨️ KOT]` + `[Bill]` |

#### 2.7 Waiter Name Display - FIXED
- Added `waiter` field to TakeAway, Delivery, Walk-In gridItems
- All order types now show waiter name instead of "NA"

---

## Memory Docs
| Document | Purpose |
|----------|---------|
| `PRD.md` | This document - requirements & implementation log |
| `ARCHITECTURE.md` | Technical architecture & data flows |
| `API_DOCUMENT_V2.md` | API endpoints & payloads |
| `API_MAPPING_AUDIT.md` | Frontend-to-API field mapping |
| `BUGS.md` | Bug tracker |
| `CLARIFICATIONS.md` | Open questions for backend/product team |

---

## Current Visual Layout (Table View Card)

```
┌─────────────────────────┐
│  Walk-In       ₹100     │  ← Header (yellow bg for Walk-In)
├─────────────────────────┤
│  Owner • Preparing      │  ← Waiter + Status (inline)
│  8 hrs                  │  ← Time since order
├─────────────────────────┤
│  [🖨️]    [Ready]        │  ← KOT + Action button
└─────────────────────────┘
```

---

## Prioritized Backlog

### P0 (Critical) - RESOLVED
- ✅ Order type differentiation (was all showing as WC)
- ✅ Visual distinction between order types

### P1 (High) - PENDING
- Multi-device race condition (BUG-210)
- Socket engage/free inconsistency (BUG-216, 221)
- Addon name mismatch (BUG-212)

### P2 (Medium) - PENDING
- `order_sub_total_without_tax` returns 0 (BUG-204)
- Partial payments implementation
- Walk-In UX flow clarification

### P3 (Low) - BACKLOG
- Edit placed item functionality
- Scheduled orders
- Service tax calculation
- Loyalty points / Wallet integration

---

## Files Modified (April 7, 2026)

| File | Changes |
|------|---------|
| `/api/constants.js` | Updated `ORDER_TYPES.TAKE_AWAY` to `'takeaway'` |
| `/api/transforms/orderTransform.js` | Added `mapOrderTypeToAPI()`, fixed `normalizeOrderType()`, fixed customer labels |
| `/components/cards/TableCard.jsx` | Updated header colors, removed border colors, added inline status, updated action buttons |
| `/pages/DashboardPage.jsx` | Added `waiter` field to TakeAway/Delivery/Walk-In gridItems |

---

## Next Tasks
1. Test all order types (Dine-In, TakeAway, Delivery, Walk-In) with new visual differentiation
2. Verify Ready/Serve/Bill buttons trigger correct API calls
3. Address P1 bugs (multi-device race, socket inconsistency)
4. Get backend clarifications from `CLARIFICATIONS.md`
