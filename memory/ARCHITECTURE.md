# MyGenie POS Frontend - Core Architecture Document

**Version:** 1.0  
**Last Updated:** April 6, 2026

---

## 1. Overview

A **React 19** single-page application for restaurant point-of-sale operations. Built with Create React App + Craco, styled with Tailwind CSS + Radix UI components.

### Tech Stack
| Layer | Technology |
|-------|------------|
| Framework | React 19 + Craco |
| Styling | Tailwind CSS, Radix UI |
| State Management | React Context API |
| HTTP Client | Axios |
| Real-time | Socket.IO Client |
| Routing | React Router DOM |
| Forms | React Hook Form + Zod |

---

## 2. Directory Structure

```
/app/frontend/src/
├── api/                    # API layer
│   ├── axios.js            # Axios instance with interceptors
│   ├── constants.js        # All API endpoint constants
│   ├── services/           # API service functions
│   ├── socket/             # Socket.IO handlers
│   │   ├── socketClient.js
│   │   ├── socketHandlers.js
│   │   └── useSocketEvents.js
│   └── transforms/         # API ↔ Frontend data transformers
│       ├── orderTransform.js
│       ├── tableTransform.js
│       ├── productTransform.js
│       └── ...
├── components/             # UI Components
│   ├── ui/                 # Radix-based primitives (Button, Dialog, etc.)
│   ├── order-entry/        # Order management components
│   ├── dashboard/          # Dashboard components
│   └── ...
├── contexts/               # React Context providers
│   ├── AppProviders.jsx    # Root provider wrapper
│   ├── AuthContext.jsx     # Authentication state
│   ├── OrderContext.jsx    # Orders state + CRUD
│   ├── TableContext.jsx    # Tables state + status
│   ├── MenuContext.jsx     # Menu/products catalog
│   ├── SocketContext.jsx   # Socket connection management
│   ├── RestaurantContext.jsx
│   └── SettingsContext.jsx
├── pages/                  # Route-level components
│   ├── LoginPage.jsx
│   ├── LoadingPage.jsx     # Initial data fetch
│   ├── DashboardPage.jsx   # Main table grid
│   └── ...
├── hooks/                  # Custom React hooks
├── utils/                  # Utility functions
├── constants/              # App-wide constants
└── data/                   # Static data/mocks
```

---

## 3. Architecture Patterns

### 3.1 Context-Based State Management

```
                    ┌─────────────────┐
                    │  AppProviders   │
                    └────────┬────────┘
         ┌──────────────────┼──────────────────┐
         │                  │                  │
    ┌────▼────┐       ┌─────▼─────┐      ┌─────▼─────┐
    │  Auth   │       │  Socket   │      │Restaurant │
    │ Context │       │  Context  │      │  Context  │
    └────┬────┘       └─────┬─────┘      └───────────┘
         │                  │
    ┌────▼────┐       ┌─────▼─────┐
    │  Menu   │       │   Order   │◄────────┐
    │ Context │       │  Context  │         │
    └─────────┘       └─────┬─────┘         │
                            │          Socket Events
                      ┌─────▼─────┐         │
                      │   Table   │─────────┘
                      │  Context  │
                      └───────────┘
```

**Key Contexts:**
- **AuthContext**: Login state, JWT token, user info
- **SocketContext**: Socket.IO connection lifecycle
- **OrderContext**: All active orders, CRUD operations
- **TableContext**: Table statuses, engaged lock mechanism
- **MenuContext**: Products, categories, addons catalog

### 3.2 Socket-First Data Flow

All order mutations follow **socket-first** pattern:

```
User Action (UI)
      │
      ▼
┌─────────────┐     HTTP Response
│  API Call   │────────────────────► (ignored for state)
│  (POST/PUT) │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Server    │
│  Processes  │
└──────┬──────┘
       │
       ▼ Socket Event
┌─────────────┐
│  Socket.IO  │
│   Handler   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Context   │ ◄── Single source of truth
│   Update    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  UI Re-render │
└─────────────┘
```

**Why Socket-First?**
- Ensures all connected clients see same data
- Prevents race conditions between HTTP response and socket
- Single source of truth (Context) updated only via socket handlers

### 3.3 Transform Layer

Bidirectional data transformation between API format and frontend format:

```
┌──────────────┐     toAPI.*()      ┌──────────────┐
│   Frontend   │ ─────────────────► │   Backend    │
│    State     │                    │     API      │
│              │ ◄───────────────── │              │
└──────────────┘    fromAPI.*()     └──────────────┘
```

**Transform Files:**
| File | Purpose |
|------|---------|
| `orderTransform.js` | Order place/update/cancel payloads |
| `tableTransform.js` | Table shift/merge/transfer |
| `productTransform.js` | Menu items normalization |
| `profileTransform.js` | Restaurant profile |

---

## 4. Key Data Flows

### 4.1 Place New Order

```
1. OrderEntry.jsx → handlePlaceOrder()
2. Build payload via toAPI.placeOrder()
3. POST /api/v1/vendoremployee/order/place-order (multipart/form-data)
4. Server emits: new-order on order channel
5. socketHandlers.handleNewOrder()
   → OrderContext.addOrder(transformedOrder)
   → TableContext.updateTableStatus(occupied)
   → Background: GET single order for enrichment
6. useEffect in OrderEntry syncs cart from context
```

### 4.2 Update Order (Add Items)

```
1. OrderEntry.jsx → handlePlaceOrder() [update path]
2. Build payload via toAPI.updateOrder()
3. PUT /api/v1/vendoremployee/order/update-place-order (JSON)
4. Server emits: update-order on order channel
5. socketHandlers.handleUpdateOrder()
   → GET /api/v2/vendoremployee/get-single-order-new
   → OrderContext.updateOrder(freshOrder)
6. useEffect syncs cart + financials
```

### 4.3 Collect Bill (Payment)

```
1. CollectPaymentPanel → onPaymentComplete()
2. Build payload via toAPI.collectBillExisting()
3. POST /api/v2/vendoremployee/order-bill-payment (JSON)
4. Server emits: update-order-status (status=6/paid)
5. socketHandlers.handleUpdateOrderStatus()
   → OrderContext.removeOrder()
   → TableContext.updateTableStatus(available)
```

---

## 5. Table Engaged Lock Mechanism

Prevents UI interactions during async operations:

```javascript
// TableContext.jsx
engagedTables: Set<number>         // React state (UI blocking)
engagedTablesRef: Ref<Set<number>> // Mutable ref (polling)

// Lock table
setTableEngaged(tableId, true)

// Wait for lock (used after API call, before redirect)
await waitForTableEngaged(tableId, 5000)

// Release after socket confirms
setTableEngaged(tableId, false)
```

**Flow:**
```
API Call → waitForTableEngaged() → Socket arrives → setEngaged(true) → 
GET enrichment → Context updated → RAF×2 → setEngaged(false)
```

---

## 6. Socket Architecture

### Connection
```javascript
// socketClient.js
const socket = io(REACT_APP_SOCKET_URL, {
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 10,
  reconnectionDelay: 1000
});
```

### Channels
| Channel | Format | Purpose |
|---------|--------|---------|
| Order | `new_order_{restaurantId}` | All order events |
| Table | `update_table_{restaurantId}` | Table status (redundant) |

### Events
| Event | Handler | Action |
|-------|---------|--------|
| `new-order` | handleNewOrder | addOrder() |
| `update-order` | handleUpdateOrder | GET + updateOrder() |
| `update-order-status` | handleUpdateOrderStatus | updateOrder() or removeOrder() |
| `update-food-status` | handleUpdateFoodStatus | GET + updateOrder() |

---

## 7. API Layer

### Axios Instance
```javascript
// axios.js
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000
});

// Request interceptor: adds JWT token
// Response interceptor: handles 401 logout
```

### Endpoint Constants
```javascript
// constants.js
export const PLACE_ORDER = '/api/v1/vendoremployee/order/place-order';
export const UPDATE_ORDER = '/api/v1/vendoremployee/order/update-place-order';
export const BILL_PAYMENT = '/api/v2/vendoremployee/order-bill-payment';
// ... 30+ endpoints
```

---

## 8. Component Hierarchy

```
App.jsx
└── AppProviders (all contexts)
    └── Router
        ├── LoginPage
        ├── LoadingPage (initial data fetch)
        └── DashboardPage
            ├── TableGrid
            │   └── TableCard (per table)
            └── OrderEntry (modal/panel)
                ├── MenuPanel (product selection)
                ├── CartPanel (current order items)
                ├── PlacedItemRow (placed items)
                ├── CollectPaymentPanel
                ├── CancelFoodModal
                └── CancelOrderModal
```

---

## 9. Environment Variables

| Variable | Purpose |
|----------|---------|
| `REACT_APP_API_BASE_URL` | Backend API base URL |
| `REACT_APP_SOCKET_URL` | Socket.IO server URL |
| `REACT_APP_BACKEND_URL` | (Emergent platform) |

---

## 10. Known Architectural Decisions

### Why Socket-First?
Multi-device POS requires all terminals to show same state. Socket ensures eventual consistency.

### Why Transform Layer?
Backend API formats differ from frontend needs. Centralizing transforms prevents scattered conversions.

### Why Context over Redux?
Simpler for this scale. Each domain (orders, tables, menu) is isolated. No cross-cutting concerns requiring middleware.

### Why Engaged Lock?
Prevents "stale click" — user clicking table before background enrichment completes would show incomplete data.

---

## 11. Related Documents

- [API_DOCUMENT_V2.md](./API_DOCUMENT_V2.md) - Detailed API payloads
- [BUGS.md](./BUGS.md) - Bug tracker & fixes
- [API_MAPPING_AUDIT.md](./API_MAPPING_AUDIT.md) - Endpoint mapping & data flow audit

---

## 12. Future Considerations

1. **WebSocket reconnection resilience** - Handle network drops gracefully
2. **Offline mode** - Queue mutations when disconnected
3. **Optimistic updates** - Show immediate feedback, rollback on socket failure
4. **State persistence** - LocalStorage for cart recovery on refresh
