# API v2 Reference — MyGenie Restaurant POS

## Document Version: 1.0
## Last Updated: April 8, 2026
## Base URL: `https://preprod.mygenie.online`

---

## 1. Authentication

### POST `/api/v1/auth/vendoremployee/login`
- **Purpose:** Employee login
- **Payload:**
  ```json
  {
    "email": "owner@18march.com",
    "password": "Qplazm@10",
    "device_token": "",
    "device_type": "web"
  }
  ```
- **Response:** `{ token, user: { id, f_name, l_name, restaurant_id, role, permissions[] } }`
- **Used By:** `authService.js` → `AuthContext.jsx`
- **Frontend Transform:** `authTransform.js`

---

## 2. Profile & Configuration

### GET `/api/v2/vendoremployee/vendor-profile/profile`
- **Purpose:** Fetch restaurant profile, features, settings
- **Headers:** `Authorization: Bearer <token>`
- **Response:** Restaurant info, enabled features (dineIn, takeAway, delivery, room), currency, tax settings
- **Used By:** `profileService.js` → `RestaurantContext.jsx`
- **Frontend Transform:** `profileTransform.js`

---

## 3. Menu

### GET `/api/v1/vendoremployee/get-categories`
- **Purpose:** Fetch menu categories
- **Headers:** `Authorization: Bearer <token>`
- **Params:** `restaurant_id`
- **Used By:** `categoryService.js` → `MenuContext.jsx`
- **Frontend Transform:** `categoryTransform.js`

### GET `/api/v1/vendoremployee/get-products-list`
- **Purpose:** Fetch products/menu items
- **Headers:** `Authorization: Bearer <token>`
- **Params:** `restaurant_id, type: 'all', limit: 100, offset: 1`
- **Used By:** `productService.js` → `MenuContext.jsx`
- **Frontend Transform:** `productTransform.js`

### GET `/api/v2/vendoremployee/buffet/buffet-popular-food`
- **Purpose:** Fetch popular food items
- **Headers:** `Authorization: Bearer <token>`
- **Params:** `restaurant_id`
- **Used By:** `productService.js` → `MenuContext.jsx`

---

## 4. Tables

### GET `/api/v1/vendoremployee/all-table-list`
- **Purpose:** Fetch all tables and rooms
- **Headers:** `Authorization: Bearer <token>`
- **Response:** Array of table objects:
  ```json
  {
    "id": 123,
    "table_no": "1",
    "title": "Default",        // Section/area name
    "rtype": "TB",             // "TB" = table, "RM" = room
    "status": 1,               // Active/Inactive
    "engage": 0,               // 0 = free, 1 = occupied
    "restaurant_id": 509,
    "waiter_id": null
  }
  ```
- **Used By:** `tableService.js` → `TableContext.jsx`
- **Frontend Transform:** `tableTransform.js`
  - `api.id` → `tableId`
  - `api.table_no` → `tableNumber`
  - `api.title` → `sectionName` (area grouping)
  - `api.rtype` → `tableType`, `isRoom` (TB/RM)
  - `api.status` → `isActive`
  - `api.engage` → `isOccupied`

### POST `/api/v1/vendoremployee/pos/order-table-room-switch`
- **Purpose:** Switch order to a different table or room
- **Used By:** `orderTransform.js` → toAPI.orderTableSwitch

### POST `/api/v1/vendoremployee/order/transfer-order`
- **Purpose:** Merge two orders (transfer items from one table to another)
- **Used By:** `orderTransform.js` → toAPI.mergeOrder

### POST `/api/v1/vendoremployee/order/transfer-food-item`
- **Purpose:** Transfer specific food items between orders
- **Used By:** `orderTransform.js` → toAPI.foodTransfer

---

## 5. Orders

### GET `/api/v1/vendoremployee/pos/employee-orders-list`
- **Purpose:** Fetch all running (active) orders
- **Headers:** `Authorization: Bearer <token>`
- **Params:** `restaurant_id`
- **Response:** Array of orders with nested `orderDetails[]`, `table{}`, `user{}`, `employee{}`
- **Key Fields:**
  ```json
  {
    "id": 730580,
    "restaurant_order_id": "ORD-123",
    "order_type": "Dine In",       // "Dine In" | "Take Away" | "Delivery" | "Room" | "Walk In"
    "f_order_status": 1,            // 1=preparing, 2=ready, 3=cancelled, 5=served, 6=paid, 7=pending, 8=running, 9=pendingPayment
    "order_status": "queue",        // "queue" = active, "delivered" = completed
    "table_id": 123,                // 0 for Walk-In/TakeAway/Delivery
    "order_amount": "500.00",
    "payment_status": "unpaid",
    "created_at": "2026-04-08T...",
    "orderDetails": [               // Individual food items
      {
        "id": 1234,
        "food_id": 567,
        "food_details": { "name": "Butter Chicken", "food_type": 0 },
        "quantity": 2,
        "price": "250.00",
        "f_food_status": 1           // Item-level status
      }
    ],
    "table": { "table_no": "5", "title": "Default" },
    "user": { "phone": "9876543210" },
    "employee": { "f_name": "Owner" }
  }
  ```
- **Used By:** `orderService.js` → `OrderContext.jsx`
- **Frontend Transform:** `orderTransform.js → fromAPI.order()`
  - `api.id` → `orderId`
  - `api.order_type` → `orderType` (mapped to camelCase: 'dineIn', 'takeAway', 'delivery', 'room', 'walkIn')
  - `api.f_order_status` → `fOrderStatus` (numeric), `status` (mapped string), `tableStatus` (for table card display)
  - `api.table_id` → `tableId`
  - `api.order_amount` → `amount`
  - `api.orderDetails[]` → `items[]` (via `fromAPI.orderItem()`)

### POST `/api/v2/vendoremployee/get-single-order-new`
- **Purpose:** Fetch single order with full financial details
- **Payload:** `{ order_id: 730580 }`
- **Used By:** `orderService.js → fetchSingleOrderForSocket()`, `reportService.js`
- **Why Needed:** Socket events don't include full financial fields (subtotal, tax, tip). This endpoint enriches the order after socket notification.

### POST `/api/v1/vendoremployee/order/place-order`
- **Purpose:** Place new order (unified: new order, new order+pay, existing order+pay)
- **Used By:** `orderTransform.js → toAPI.placeOrder()`

### PUT `/api/v1/vendoremployee/order/update-place-order`
- **Purpose:** Update existing order (add items to running order)
- **Used By:** `orderTransform.js → toAPI.updateOrder()`

---

## 6. Order Status Operations

### PUT `/api/v2/vendoremployee/order-status-update`
- **Purpose:** Update order-level status (ready, serve, cancel)
- **Payload:**
  ```json
  {
    "order_id": "730580",
    "order_status": "ready",          // "ready" | "serve"
    "employee_name": "Owner"
  }
  ```
- **Used By:** `orderService.js → updateOrderStatus()`
- **Called From:** `DashboardPage.jsx → handleMarkReady()`, `handleMarkServed()`
- **Socket Response:** `update-order-status` event on `new_order_{restaurantId}` channel
- **Frontend Transform:** `orderTransform.js → toAPI.updateOrderStatus()`

### PUT `/api/v2/vendoremployee/food-status-update`
- **Purpose:** Update item-level food status (ready, serve per item)
- **Payload:**
  ```json
  {
    "order_id": 730580,
    "order_food_id": 1234,
    "item_id": 1234,
    "order_status": "ready",          // "ready" | "serve"
    "cancel_type": null
  }
  ```
- **Used By:** `DashboardPage.jsx → handleItemStatusChange()`
- **Socket Response:** `update-food-status` event on `new_order_{restaurantId}` channel
- **Known Issue:** Backend does NOT emit `update-table` socket event for this. Frontend workaround in `socketHandlers.js → handleUpdateFoodStatus()`.

### POST `/api/v1/vendoremployee/order/cancel-food-item`
- **Purpose:** Cancel individual food item from an order
- **Payload:** `{ order_id, order_food_id, cancel_type, reason_id, restaurant_id, employee_name }`
- **Used By:** `orderTransform.js → toAPI.cancelItem()`

---

## 7. Payment

### POST `/api/v2/vendoremployee/order-bill-payment`
- **Purpose:** Collect bill payment on existing order
- **Used By:** `orderTransform.js → toAPI.billPayment()`

### POST `/api/v1/vendoremployee/order/clear-bill`  *(TBD — not yet implemented)*
- **Purpose:** Clear bill / mark as paid
- **Used By:** `paymentService.js → clearBill()`
- **Status:** Service exists but not wired in UI

---

## 8. Room Operations

### POST `/api/v1/vendoremployee/pos/user-group-check-in`
- **Purpose:** Room check-in (create guest entry for room)
- **Used By:** `roomService.js → roomCheckIn()`, `roomCheckInWithOrder()`

### POST `/api/v1/vendoremployee/order-shifted-room`
- **Purpose:** Mark order as shifted to room
- **Used By:** Referenced in constants

---

## 9. Settings

### GET `/api/v1/vendoremployee/cancellation-reasons`
- **Purpose:** Fetch cancellation reasons for order/item cancellation
- **Params:** `restaurant_id, type` ('Order', 'Food', or null for both)
- **Used By:** `settingsService.js` → `SettingsContext.jsx`
- **Frontend Transform:** `settingsTransform.js`

---

## 10. Search

### GET `/api/v2/vendoremployee/restaurant-customer-list`
- **Purpose:** Search customers by phone/name
- **Params:** `restaurant_id, search_text`
- **Used By:** `customerService.js`
- **Frontend Transform:** `customerTransform.js`

---

## 11. Reports

### POST `/api/v2/vendoremployee/paid-order-list`
- **Purpose:** Paid orders report
- **Payload:** `{ search_date: "YYYY-MM-DD" }`

### POST `/api/v2/vendoremployee/cancel-order-list`
- **Purpose:** Cancelled orders report

### POST `/api/v2/vendoremployee/paid-in-tab-order-list`
- **Purpose:** Credit/tab orders report

### POST `/api/v2/vendoremployee/paid-paylater-order-list`
- **Purpose:** Hold/pay-later orders report

### POST `/api/v1/vendoremployee/urbanpiper/get-complete-order-list`
- **Purpose:** Aggregator (Swiggy/Zomato) orders report

### GET `/api/v2/vendoremployee/employee-order-details`
- **Purpose:** Order details for report drill-down
- **Params:** `order_id`

### POST `/api/v2/vendoremployee/daily-sales-revenue-report`
- **Purpose:** Daily sales summary

### POST `/api/v2/vendoremployee/report/order-logs-report`
- **Purpose:** Order audit logs

---

## 12. f_order_status Mapping

| API Value | Frontend Status | Table Card Status | Description |
|-----------|----------------|-------------------|-------------|
| 1 | `preparing` | `occupied` | Order confirmed, being prepared |
| 2 | `ready` | `occupied` | Order ready for pickup/serve |
| 3 | `cancelled` | `available` | Order cancelled |
| 5 | `served` | `billReady` | Order served to customer |
| 6 | `paid` | `available` | Payment completed |
| 7 | `pending` | `yetToConfirm` | Order pending confirmation |
| 8 | `running` | `occupied` | Order in progress |
| 9 | `pendingPayment` | `occupied` | Awaiting payment |

---

## 13. Socket Events

### Channel: `new_order_{restaurantId}`
All order events come through this channel.

| Event | Message Format | Trigger |
|-------|---------------|---------|
| `new-order` | `[event, order_id, restaurant_id, f_order_status, {orders: [...]}]` | New order placed |
| `update-order` | `[event, order_id, restaurant_id, f_order_status]` | Order updated (items added) |
| `update-food-status` | `[event, order_id, restaurant_id, f_order_status]` | Item-level status change |
| `update-order-status` | `[event, order_id, restaurant_id, f_order_status]` | Order-level status change |
| `scan-new-order` | `[event, order_id, restaurant_id, f_order_status]` | QR code order |
| `delivery-assign-order` | `[event, order_id, restaurant_id, rider_id]` | Delivery rider assigned |

### Channel: `update_table_{restaurantId}`
| Event | Message Format | Trigger |
|-------|---------------|---------|
| `update-table` | `[event, table_id, restaurant_id, status]` | Table status change (engage/free) |

### Channel: `aggregator_order_{restaurantId}`
| Event | Message Format | Trigger |
|-------|---------------|---------|
| `aggrigator-order` | TBD | New aggregator order |
| `aggrigator-order-update` | TBD | Aggregator order update |

### Socket URL: `https://presocket.mygenie.online`
### Socket Config:
- Reconnection: true
- Reconnection attempts: 10
- Reconnection delay: 1000ms (max 30000ms)
- Timeout: 5000ms
