# Architecture Document — MyGenie Restaurant POS

## Document Version: 1.0
## Last Updated: April 8, 2026

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MyGenie Restaurant POS                              │
│                     (Frontend-Only React Application)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐     ┌──────────────────┐     ┌────────────────────────┐  │
│  │   React App  │────▶│  Preprod Backend  │     │  Socket Server         │  │
│  │   Port 3000  │     │  (External)       │     │  (External)            │  │
│  │              │◀────│                   │     │                        │  │
│  │  CRA + Craco │     │  preprod.mygenie  │     │  presocket.mygenie     │  │
│  │  React 19    │     │  .online          │     │  .online               │  │
│  │  Tailwind    │     │                   │     │                        │  │
│  └──────────────┘     └──────────────────┘     └────────────────────────┘  │
│         │                      │                         │                  │
│         │    REST API (v1/v2)  │    Socket.IO (WebSocket)│                  │
│         └──────────────────────┘─────────────────────────┘                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **No backend in this repository.** All backend APIs are external (preprod.mygenie.online).
- **Socket server** is separate from REST API server.
- **Frontend-only** app using Create React App with Craco for config overrides.

---

## 2. Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19 | UI framework |
| Create React App | via Craco | Build tooling |
| Tailwind CSS | 3.x | Styling |
| Socket.IO Client | 4.x | Real-time order updates |
| Axios | — | HTTP client for REST APIs |
| React Router DOM | 6.x | Client-side routing |
| Lucide React | — | Icons |
| Radix UI | — | Accessible UI primitives |
| PropTypes | — | Runtime type checking |

---

## 3. Directory Structure

```
/app/frontend/src/
├── api/                          # API layer (all external communication)
│   ├── axios.js                  # Axios instance with interceptors, base URL, auth headers
│   ├── constants.js              # API_ENDPOINTS, status mappings, field aliases
│   ├── index.js                  # Barrel exports
│   ├── services/                 # Service functions (one per domain)
│   │   ├── authService.js        # Login
│   │   ├── categoryService.js    # Menu categories
│   │   ├── customerService.js    # Customer search
│   │   ├── orderService.js       # Orders CRUD, status updates
│   │   ├── paymentService.js     # Bill payment, clear bill
│   │   ├── productService.js     # Products/menu items
│   │   ├── profileService.js     # Restaurant profile
│   │   ├── reportService.js      # Order reports (paid, cancelled, credit, etc.)
│   │   ├── roomService.js        # Room check-in
│   │   ├── settingsService.js    # Cancellation reasons
│   │   └── tableService.js       # Table list
│   ├── socket/                   # Socket.IO real-time layer
│   │   ├── socketEvents.js       # Event names, channel generators, config
│   │   ├── socketHandlers.js     # Business logic per socket event
│   │   ├── socketService.js      # Socket connection management
│   │   ├── useSocketEvents.js    # React hook for socket event subscription
│   │   └── index.js
│   └── transforms/               # API ↔ Frontend data mapping
│       ├── authTransform.js
│       ├── categoryTransform.js
│       ├── customerTransform.js
│       ├── orderTransform.js     # Largest transform — orders, items, payments, cancellation
│       ├── productTransform.js
│       ├── profileTransform.js
│       ├── reportTransform.js
│       ├── settingsTransform.js
│       ├── tableTransform.js
│       └── index.js
│
├── components/                   # UI Components
│   ├── cards/                    # Card components for dashboard
│   │   ├── TableCard.jsx         # Compact grid card for table view (160px wide)
│   │   └── OrderCard.jsx         # Full order card with item details, actions
│   ├── dashboard/                # NEW: Channel-based layout components
│   │   ├── ChannelColumnsLayout.jsx  # Main container, state, arrows, smart defaults
│   │   ├── ChannelColumn.jsx     # Individual channel column (header + grid)
│   │   ├── ResizeHandle.jsx      # Drag handle between columns (Phase B)
│   │   └── index.js              # Barrel exports
│   ├── guards/                   # Route guards
│   │   ├── ErrorBoundary.jsx
│   │   └── ProtectedRoute.jsx
│   ├── layout/                   # Layout components
│   │   ├── Header.jsx            # Top bar: search, filters, view toggle, add order
│   │   └── Sidebar.jsx           # Left navigation sidebar
│   ├── modals/                   # Modal dialogs
│   │   └── CancelModal.jsx       # Order/item cancellation modal
│   ├── order-entry/              # Order taking flow
│   │   ├── OrderEntry.jsx        # Full order entry page/modal
│   │   ├── OrderPanel.jsx        # Order summary panel (right side)
│   │   └── ...
│   ├── panels/                   # Sidebar panels
│   │   └── NotificationPanel.jsx
│   ├── reports/                  # Report components
│   │   └── ...
│   └── sections/                 # DEPRECATED: Area-based layout
│       └── TableSection.jsx      # Will be removed after channel layout approved
│
├── constants/                    # App-wide constants
│   ├── colors.js                 # COLORS object (brand orange, grays, greens, etc.)
│   ├── config.js                 # App configuration
│   ├── featureFlags.js           # USE_CHANNEL_LAYOUT = true
│   └── index.js                  # Barrel exports
│
├── contexts/                     # React Context providers (global state)
│   ├── AppProviders.jsx          # Wraps all providers in correct order
│   ├── AuthContext.jsx           # User, token, permissions, login/logout
│   ├── MenuContext.jsx           # Categories, products, popular items
│   ├── OrderContext.jsx          # Running orders, CRUD operations
│   ├── RestaurantContext.jsx     # Restaurant profile, features, settings
│   ├── SettingsContext.jsx       # Cancellation reasons
│   ├── SocketContext.jsx         # Socket connection, event routing
│   ├── TableContext.jsx          # Tables, rooms, engage/release state
│   └── index.js                  # Barrel exports
│
├── hooks/                        # Custom React hooks
│   ├── useLocalStorage.js        # Persist state in localStorage
│   ├── useRefreshAllData.js      # Refresh all contexts on demand
│   ├── use-toast.js              # Toast notification hook
│   └── index.js
│
├── pages/                        # Route-level page components
│   ├── LoginPage.jsx             # Email/password login
│   ├── LoadingPage.jsx           # Sequential API loading screen
│   ├── DashboardPage.jsx         # Main dashboard (1114 lines — orchestrator)
│   ├── OrderSummaryPage.jsx      # Order summary/details
│   ├── AllOrdersReportPage.jsx   # Reports page
│   └── index.js
│
├── utils/                        # Utility functions
│   ├── statusHelpers.js          # Status priority sorting, color mapping
│   ├── businessDay.js            # Business day date calculations
│   └── index.js
│
├── data/                         # Mock data (for development/testing)
│   ├── mockTables.js
│   ├── mockOrders.js
│   ├── mockMenu.js
│   ├── mockCustomers.js
│   ├── mockConstants.js
│   └── notePresets.js
│
└── __tests__/                    # Test files
    ├── api/                      # API layer tests
    ├── contexts/                 # Context tests
    ├── guards/                   # Guard tests
    ├── integration/              # Integration tests
    └── structure/                # Structure validation tests
```

---

## 4. Context Architecture (Global State)

```
AppProviders (wraps all providers)
│
├── AuthContext
│   ├── user: { id, name, roleName, restaurantId, permissions[] }
│   ├── token: string
│   ├── login(email, password)
│   ├── logout()
│   └── hasPermission(permissionKey): boolean
│
├── RestaurantContext
│   ├── restaurant: { id, name, currency, features, taxSettings, ... }
│   ├── features: { dineIn, takeaway, delivery, room }
│   └── currencySymbol: string
│
├── SocketContext
│   ├── socket: Socket.IO instance
│   ├── isConnected: boolean
│   ├── connectionStatus: string
│   └── useSocketEvent(event, handler): hook
│
├── TableContext
│   ├── apiTables: Table[]            (raw from API)
│   ├── tablesLoaded: boolean
│   ├── updateTableStatus(tableId, status)
│   ├── isTableEngaged(tableId): boolean
│   ├── setTableEngaged(tableId, engaged)
│   └── refreshTables()
│
├── OrderContext
│   ├── dineInOrders: Order[]
│   ├── takeAwayOrders: Order[]
│   ├── deliveryOrders: Order[]
│   ├── walkInOrders: Order[]
│   ├── roomOrders: Order[]
│   ├── addOrder(order)
│   ├── updateOrder(orderId, order)
│   ├── removeOrder(orderId)
│   ├── getOrderById(orderId): Order
│   ├── getOrderByTableId(tableId): Order
│   └── orderItemsByTableId: Map
│
├── MenuContext
│   ├── categories: Category[]
│   ├── products: Product[]
│   ├── popularItems: Product[]
│   └── getProductById(id): Product
│
└── SettingsContext
    ├── cancellationReasons: Reason[]
    └── getCancellationReasons(type): Reason[]
```

---

## 5. Data Flow

### 5.1 Initial Load Sequence

```
LoginPage
  → POST /api/v1/auth/vendoremployee/login
  → Store token + user in AuthContext
  → Navigate to /loading

LoadingPage (sequential API calls)
  → GET /api/v2/.../profile              → RestaurantContext
  → GET /api/v1/.../get-categories       → MenuContext
  → GET /api/v1/.../get-products-list    → MenuContext
  → GET /api/v1/.../all-table-list       → TableContext
  → GET /api/v1/.../cancellation-reasons → SettingsContext
  → GET /api/v2/.../buffet-popular-food  → MenuContext
  → GET /api/v1/.../employee-orders-list → OrderContext
  → All loaded → Navigate to /dashboard

SocketContext
  → Connect to presocket.mygenie.online
  → Subscribe to new_order_{restaurantId} channel
  → Subscribe to update_table_{restaurantId} channel
  → Route events to socketHandlers.js
```

### 5.2 Socket Event Flow

```
Socket Event Received
  │
  ├── new-order ────────────────────▶ handleNewOrder
  │   └── Parse payload → addOrder → syncTableStatus → fetch enrichment → updateOrder
  │
  ├── update-order ─────────────────▶ handleUpdateOrder
  │   └── fetchOrderWithRetry → updateOrder → syncTableStatus → releaseTable
  │
  ├── update-food-status ───────────▶ handleUpdateFoodStatus
  │   └── engageTable → fetchOrderWithRetry → updateOrder → syncTableStatus → releaseTable
  │
  ├── update-order-status ──────────▶ handleUpdateOrderStatus
  │   └── fetchOrderWithRetry → (remove if cancelled/paid, else update) → releaseTable
  │
  ├── scan-new-order ───────────────▶ handleScanNewOrder
  │   └── fetchOrderWithRetry → addOrder → syncTableStatus
  │
  ├── delivery-assign-order ────────▶ handleDeliveryAssignOrder
  │   └── fetchOrderWithRetry → updateOrder → syncTableStatus
  │
  └── update-table ─────────────────▶ handleUpdateTable
      └── engage/free → setTableEngaged or updateTableStatus
```

### 5.3 Dashboard Data Flow (Channel Layout)

```
OrderContext + TableContext
         │
         ▼
DashboardPage.jsx
         │
    ┌────┴────┐
    │ useMemo │  tables, flatTables, allTablesList, allRoomsList
    │         │  channelData = { dineIn, takeAway, delivery, room }
    └────┬────┘
         │
         ▼
ChannelColumnsLayout
  ├── maxColumns state (per channel, resets on mount)
  ├── Smart default calculation (measure container → distribute)
  ├── Arrow handlers (independent per channel)
  │
  ├── ChannelColumn (Dine-In)
  │   ├── Header: < Dine-In 15/22 >
  │   ├── Grid: repeat(actualColumns, 160px)
  │   └── TableCard × N  (table view)
  │       OrderCard × N  (order view)
  │
  ├── ResizeHandle ────── (between columns, Phase B)
  │
  ├── ChannelColumn (TakeAway)
  │   └── ...
  │
  ├── ResizeHandle
  │
  ├── ChannelColumn (Delivery)
  │   └── ...
  │
  ├── ResizeHandle
  │
  └── ChannelColumn (Room)
      └── ...
```

---

## 6. Routing

```
/                   → LoginPage
/loading            → LoadingPage (sequential API loading)
/dashboard          → DashboardPage (main view)
/order-entry/:id    → OrderEntry (order taking/editing)
/order-summary/:id  → OrderSummaryPage
/reports            → AllOrdersReportPage
```

All routes except `/` are protected by `ProtectedRoute` (requires auth token).

---

## 7. Key Design Patterns

### 7.1 Transform Layer
All API ↔ Frontend data mapping goes through `transforms/`. No component directly uses API field names. This isolates the frontend from backend field name changes.

```
API Response → fromAPI.order(apiData) → Frontend Order Object
Frontend Data → toAPI.placeOrder(data) → API Payload
```

### 7.2 Permission-Based UI
UI is a "dumb" display layer. Action buttons (Cancel, Bill, Print, Ready, Serve) visibility is controlled by:
```javascript
const { hasPermission } = useAuth();
canCancelOrder={hasPermission('order_cancel')}
canBill={hasPermission('bill')}
canPrintBill={hasPermission('print_icon')}
```
No frontend logic for time windows, restaurant settings, or role-based checks.

### 7.3 Table Engage/Release Pattern
To prevent race conditions during API calls:
```
1. setTableEngaged(tableId, true)    → Spinner ON, clicks disabled
2. API call
3. Socket event arrives
4. Context updated
5. setTableEngaged(tableId, false)   → Spinner OFF
```
`isTableEngaged` function checks the engaged state for each table.

### 7.4 Feature Flag
Major UI changes are behind feature flags:
```javascript
// /constants/featureFlags.js
export const USE_CHANNEL_LAYOUT = true;
```
Old area-based layout preserved behind `else` branch for safe rollback.

---

## 8. Component Hierarchy (Dashboard)

```
DashboardPage
├── Sidebar (left navigation)
├── Header
│   ├── Search bar
│   ├── Status filters (Confirm, Cooking, Ready, Running, Schedule)
│   ├── View toggle (Table / Order)
│   ├── Active-first toggle
│   └── Add order button
│
├── [USE_CHANNEL_LAYOUT = true]
│   └── ChannelColumnsLayout
│       ├── ChannelColumn (per visible channel)
│       │   ├── Arrow buttons (< >)
│       │   ├── Channel header (name + count)
│       │   └── Card grid
│       │       ├── TableCard (table view)
│       │       └── OrderCard (order view)
│       └── ResizeHandle (between columns)
│
└── [USE_CHANNEL_LAYOUT = false]
    ├── Table View
    │   ├── TableSection (area-based, if sections exist)
    │   └── Grid of TableCards
    └── Order View
        └── Multi-column OrderCards
```

---

## 9. State Management Summary

| State | Location | Persistence | Scope |
|-------|----------|-------------|-------|
| Auth (user, token) | AuthContext + localStorage | Persisted | Global |
| Restaurant profile | RestaurantContext | Session | Global |
| Tables | TableContext | Session | Global |
| Orders | OrderContext | Session | Global |
| Menu | MenuContext | Session | Global |
| Settings | SettingsContext | Session | Global |
| Socket connection | SocketContext | Session | Global |
| Channel maxColumns | ChannelColumnsLayout (useState) | None (resets on mount) | Component |
| View type (table/order) | DashboardPage (useState) | None | Page |
| Active channels | DashboardPage (useState) | None | Page |
| Search query | DashboardPage (useState) | None | Page |

---

## 10. External Dependencies

| Service | URL | Purpose |
|---------|-----|---------|
| REST API | `https://preprod.mygenie.online` | All CRUD operations |
| Socket Server | `https://presocket.mygenie.online` | Real-time order/table updates |

Both are configured via environment variables:
- `REACT_APP_API_BASE_URL`
- `REACT_APP_SOCKET_URL`
