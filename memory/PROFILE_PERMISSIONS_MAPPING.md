# Profile API — User Roles, Permissions & Restaurant Settings Mapping

**Version:** 2.0 (P0 Complete)
**Last Updated:** February 2026
**Source Endpoint:** `GET /api/v2/vendoremployee/vendor-profile/profile`

---

## Table of Contents

1. [API Response Overview](#1-api-response-overview)
2. [User Identity Fields](#2-user-identity-fields)
3. [Role & Permissions Array (`api.role`)](#3-role--permissions-array-apirole)
4. [Known Permission Strings & UI Mapping](#4-known-permission-strings--ui-mapping)
5. [Role Name Archetypes](#5-role-name-archetypes)
6. [Restaurant Cancellation Settings](#6-restaurant-cancellation-settings)
7. [Restaurant Feature Flags](#7-restaurant-feature-flags)
8. [Restaurant Payment Configuration](#8-restaurant-payment-configuration)
9. [Restaurant Settings Object](#9-restaurant-settings-object)
10. [Current Implementation Status](#10-current-implementation-status)
11. [Action → Permission → Component Matrix](#11-action--permission--component-matrix)

---

## 1. API Response Overview

The Profile API returns the employee's identity, their assigned role + permission array, and the restaurant configuration (features, taxes, printers, schedules, cancellation rules, payment options).

```
GET /api/v2/vendoremployee/vendor-profile/profile
Authorization: Bearer <token>

Response shape:
{
  "id": number,                      // owner/vendor ID
  "emp_id": number,                  // employee ID
  "emp_f_name": string,              // first name
  "emp_l_name": string,              // last name
  "emp_email": string,               // email
  "phone": string,                   // phone
  "role_name": string,               // "Owner" | "Manager" | "Waiter" | "Captain" | custom
  "role": [ ...permissions ],        // array of permission strings
  "default_user": "Yes" | "No",
  "image": string | null,
  "restaurants": [ { ...restaurant } ]
}
```

### Transform Location
- **File:** `/app/frontend/src/api/transforms/profileTransform.js`
- **Function:** `fromAPI.profileResponse(api)` → returns `{ user, restaurant, permissions }`

### Context Storage
| Data | Stored In | How Accessed |
|------|-----------|--------------|
| `user` (identity) | `AuthContext.user` | `useAuth().user` |
| `permissions` (role array) | `AuthContext.permissions` | `useAuth().permissions`, `hasPermission('...')` |
| `restaurant` (config) | `RestaurantContext.restaurant` | `useRestaurant().restaurant` |

---

## 2. User Identity Fields

| API Field | Transform Key | Type | Description | UI Usage |
|-----------|--------------|------|-------------|----------|
| `id` | `user.ownerId` | number | Vendor/owner ID | Internal reference |
| `emp_id` | `user.employeeId` | number | Employee ID | Sent in order payloads as `employee_id` |
| `emp_f_name` | `user.firstName` | string | First name | Sidebar profile, order attribution |
| `emp_l_name` | `user.lastName` | string | Last name | Sidebar profile |
| `emp_f_name + emp_l_name` | `user.fullName` | string | Combined name | Display in Header/Sidebar |
| `emp_email` / `email` | `user.email` | string | Email address | Profile display |
| `phone` | `user.phone` | string | Phone number | Profile display |
| `role_name` | `user.roleName` | string | Human-readable role | Sent in cancel/status APIs as `role_name` |
| `default_user` | `user.isDefaultUser` | boolean | Whether this is the default (owner) account | May affect certain permissions |
| `image` | `user.image` | string/null | Profile image URL | Sidebar avatar |

---

## 3. Role & Permissions Array (`api.role`)

The `role` field in the API response is a **flat array of permission strings**. Each string represents a specific action the user is allowed to perform. The array is role-dependent — an "Owner" gets all permissions, while a restricted "Waiter" may get only a subset.

```javascript
// Example for Owner/Manager (all permissions)
"role": [
  "order_cancel",
  "food_cancel",
  "order_edit",
  "order_view",
  "table_shift",
  "table_merge",
  "food_transfer",
  "bill_collect",
  "bill_print",
  "kot_print",
  "discount_apply",
  "complementary_apply",
  "customer_manage",
  "menu_manage",
  "report_view",
  "settings_manage",
  "employee_manage",
  "table_manage",
  "room_manage",
  "printer_manage"
]

// Example for restricted Waiter
"role": [
  "order_view",
  "order_edit",
  "kot_print",
  "bill_print"
]
```

### How Permissions Are Consumed

```javascript
// AuthContext.jsx provides:
const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();

// Single check
const canCancel = hasPermission('order_cancel');

// Any of multiple
const canManageTables = hasAnyPermission(['table_shift', 'table_merge']);

// All required
const isAdmin = hasAllPermissions(['settings_manage', 'employee_manage']);
```

---

## 4. Known Permission Strings & UI Mapping

| Permission String | Description | UI Component(s) Affected | Visibility Rule | Status |
|-------------------|-------------|--------------------------|-----------------|--------|
| `order_cancel` | Cancel entire order | `OrderCard` → Cancel [X] button (footer) | Hide button if missing | **MAPPED** — `canCancelOrder` prop gated in `OrderCard.jsx`, passed from `DashboardPage.jsx` via `hasPermission('order_cancel')` |
| `food_cancel` | Cancel individual food item | `OrderEntry` → `CancelFoodModal` | Hide item cancel if missing | **MISSING** — Not yet gated in `OrderEntry.jsx` |
| `order_edit` | Edit/update an existing order (add items) | `OrderCard` → tap to open `OrderEntry`, `OrderEntry` → add items flow | Disable card tap or hide edit controls | **MISSING** — Card tap not gated |
| `order_view` | View orders on dashboard | `DashboardPage` → Order View tab | Hide Order View entirely if missing | **MISSING** — Order View always visible |
| `table_shift` | Shift order to another table | `OrderCard` → Shift button (header), `OrderEntry` → `ShiftTableModal` | Hide shift button if missing | **MAPPED** — `canShiftTable` prop gated in `OrderCard.jsx`, passed from `DashboardPage.jsx` via `hasPermission('table_shift')`. `OrderEntry.jsx` NOT yet gated |
| `table_merge` | Merge orders from two tables | `OrderCard` → Merge button (header), `OrderEntry` → `MergeTableModal` | Hide merge button if missing | **MAPPED** — `canMergeOrder` prop gated in `OrderCard.jsx`, passed from `DashboardPage.jsx` via `hasPermission('table_merge')`. `OrderEntry.jsx` NOT yet gated |
| `food_transfer` | Transfer item to another table's order | `OrderCard` → Food Transfer icon (item row), `OrderEntry` → `TransferFoodModal` | Hide transfer icon if missing | **MAPPED** — `canFoodTransfer` prop gated in `OrderCard.jsx`, passed from `DashboardPage.jsx` via `hasPermission('food_transfer')`. `OrderEntry.jsx` NOT yet gated |
| `bill_collect` | Collect payment / settle bill | `OrderCard` → Bill button (footer), `OrderEntry` → `CollectPaymentPanel` | Hide bill button if missing | **MISSING** — Bill button not gated (currently disabled for Phase 2) |
| `bill_print` | Print bill receipt | `OrderCard` → Bill print action (Phase 2) | Disable print if missing | **MISSING** — Phase 2 |
| `kot_print` | Print Kitchen Order Ticket | `OrderCard` → KOT button (footer, Phase 2) | Disable KOT if missing | **MISSING** — Phase 2 |
| `discount_apply` | Apply manual/coupon discounts | `OrderEntry` → Discount section | Hide discount controls if missing | **MISSING** — Not yet gated |
| `complementary_apply` | Mark item as complementary | `OrderEntry` → Complementary toggle | Hide complementary option if missing | **MISSING** — Not implemented |
| `customer_manage` | Search/add customers | `OrderEntry` → `CustomerModal` | Disable customer button if missing | **MISSING** — Not yet gated |
| `menu_manage` | Manage menu items | Sidebar → Menu Management | Hide menu management link if missing | **MISSING** — Not yet gated |
| `report_view` | View reports/analytics | Sidebar → Reports, `AllOrdersReportPage` | Hide reports link if missing | **MISSING** — Not yet gated |
| `settings_manage` | Access settings | Sidebar → Settings, `SettingsPanel` | Hide settings link if missing | **MISSING** — Not yet gated |
| `employee_manage` | Manage employees | Sidebar → Employee section | Hide employee management if missing | **MISSING** — Not yet gated |
| `table_manage` | Manage table layout | Sidebar → Table management | Hide table management if missing | **MISSING** — Not yet gated |
| `room_manage` | Manage rooms | Sidebar → Room section | Hide room management if missing | **MISSING** — Not yet gated |
| `printer_manage` | Manage printers | Settings → Printer config | Hide printer settings if missing | **MISSING** — Not yet gated |

---

## 5. Role Name Archetypes

| `role_name` Value | Typical Permission Set | Description |
|-------------------|----------------------|-------------|
| `Owner` | ALL permissions | Restaurant owner — full access |
| `Manager` | ALL or nearly all | On-duty manager — full operational access |
| `Captain` | `order_*`, `food_*`, `table_*`, `bill_*`, `kot_print`, `customer_manage` | Floor captain — order operations, no admin |
| `Waiter` | `order_view`, `order_edit`, `kot_print` | Basic waiter — view/take orders only |
| `Cashier` | `order_view`, `bill_collect`, `bill_print`, `report_view` | Cashier — billing and reports |
| `KDS` | `order_view` | Kitchen Display — view-only |
| Custom roles | Varies | Restaurant-defined custom roles |

**Note:** `role_name` is sent in API payloads (e.g., cancel order requires `role_name`). The actual permissions come from the `role` array, not the role name.

---

## 6. Restaurant Cancellation Settings

These fields are on the **restaurant object** (inside `restaurants[0]`) and control when/how cancellations are allowed. They are **operational business rules** set by the restaurant owner.

| API Field | Type | Values | Description | UI Impact |
|-----------|------|--------|-------------|-----------|
| `cancle_post_serve` | string | `"Yes"` / `"No"` | Allow cancellation of items **after** they've been served | If `"No"`: hide cancel button for items with `status === "served"` |
| `allow_cancel_post_server` | string | `"Yes"` / `"No"` | Secondary flag for post-serve cancellation (redundant with above, both must be checked) | Same as above — double-gate |
| `cancel_order_time` | number/string | Minutes (e.g., `30`) or `0` for unlimited | Time window (in minutes) after order creation within which full order cancellation is allowed | If elapsed: disable/hide Cancel Order button, show "Cancellation window expired" tooltip |
| `cancel_food_timings` | number/string | Minutes (e.g., `15`) or `0` for unlimited | Time window after item was added within which individual item cancellation is allowed | If elapsed: disable/hide Cancel Item action |

### Current Transform Status
**MAPPED** in `profileTransform.js` → `fromAPI.restaurant()` as `cancellation` object. Exposed via `RestaurantContext.cancellation`.

```javascript
// profileTransform.js → fromAPI.restaurant()
cancellation: {
  allowPostServeCancel: toBoolean(api.cancle_post_serve),         // Note: API has typo "cancle"
  allowPostServeCancel2: toBoolean(api.allow_cancel_post_server), // Redundant gate
  orderCancelWindowMinutes: parseInt(api.cancel_order_time) || 0, // 0 = unlimited
  itemCancelWindowMinutes: parseInt(api.cancel_food_timings) || 0, // 0 = unlimited
},
```

**UI Consumption Status:** **MISSING** — The cancellation settings are mapped in the transform and exposed via `RestaurantContext.cancellation`, but the time-window checks are not yet enforced in `OrderCard.jsx` or `OrderEntry.jsx`. The `allowPostServeCancel` flag is not yet checked when rendering cancel actions for served items.

### Cancellation Decision Matrix

| Scenario | Permission Check | Setting Check | Result |
|----------|-----------------|---------------|--------|
| Cancel entire order | `hasPermission('order_cancel')` | `cancel_order_time` not expired | Allow |
| Cancel entire order | `hasPermission('order_cancel')` | `cancel_order_time` expired | Block |
| Cancel entire order | No `order_cancel` permission | — | Block (hide button) |
| Cancel pre-serve item | `hasPermission('food_cancel')` | `cancel_food_timings` not expired | Allow |
| Cancel pre-serve item | `hasPermission('food_cancel')` | `cancel_food_timings` expired | Block |
| Cancel post-serve item | `hasPermission('food_cancel')` | `cancle_post_serve === "Yes"` | Allow |
| Cancel post-serve item | `hasPermission('food_cancel')` | `cancle_post_serve === "No"` | Block (hide button for served items) |

---

## 7. Restaurant Feature Flags

These control which order types and features are enabled for the restaurant.

| API Field | Transform Key | Type | UI Impact |
|-----------|--------------|------|-----------|
| `dine_in` | `features.dineIn` | boolean | Show/hide Dine-In tables on Dashboard |
| `delivery` | `features.delivery` | boolean | Show/hide Delivery order section |
| `take_away` | `features.takeaway` | boolean | Show/hide TakeAway order section |
| `room` | `features.room` | boolean | Show/hide Room tables on Dashboard |
| `inventory` | `features.inventory` | boolean | Enable inventory management |
| `tip` | `features.tip` | boolean | Show tip input in payment collection |
| `service_charge` | `features.serviceCharge` | boolean | Apply service charge to orders |

### Currently Mapped: YES (in `profileTransform.js` lines 70-78)

---

## 8. Restaurant Payment Configuration

| API Field | Transform Key | Type | UI Impact |
|-----------|--------------|------|-----------|
| `pay_cash` | `paymentMethods.cash` | boolean | Show Cash option in `CollectPaymentPanel` |
| `pay_upi` | `paymentMethods.upi` | boolean | Show UPI option |
| `pay_cc` | `paymentMethods.card` | boolean | Show Card option |
| `pay_tab` | `paymentMethods.tab` | boolean | Show Tab/Credit option |
| `payment_types[]` | `paymentTypes` | array | List of custom payment types (id, name, displayName) |

### Currently Mapped: YES (in `profileTransform.js` lines 88-96)

---

## 9. Restaurant Settings Object

Nested under `restaurants[0].settings`:

| API Field | Transform Key | Type | UI Impact |
|-----------|--------------|------|-----------|
| `is_coupon` | `settings.isCoupon` | boolean | Show coupon input in payment/discount |
| `is_loyality` | `settings.isLoyalty` | boolean | Show loyalty points section |
| `is_customer_wallet` | `settings.isCustomerWallet` | boolean | Show wallet balance option |
| `aggregator_auto_kot` | `settings.aggregatorAutoKot` | boolean | Auto-print KOT for aggregator orders |
| `default_prep_time` | `settings.defaultPrepTime` | number | Default preparation time (minutes) for new orders |

### Currently Mapped: YES (in `profileTransform.js` lines 172-181)

---

## 10. Current Implementation Status

| Area | Mapped in Transform? | Consumed in UI? | Status | Notes |
|------|---------------------|-----------------|--------|-------|
| User identity | YES | YES (Sidebar, Header) | **DONE** | Complete |
| Role name (`role_name`) | YES | YES (sent in API calls) | **DONE** | Complete |
| Permissions array (`role`) | YES (stored as flat array) | **PARTIAL** — OrderCard buttons gated | **IN PROGRESS** | `order_cancel`, `table_merge`, `table_shift`, `food_transfer` gated in OrderCard. OrderEntry & Sidebar NOT gated |
| Restaurant features | YES | PARTIAL (dineIn/delivery/takeaway used in filtering) | **DONE** | |
| Restaurant tax | YES | YES (order calculations) | **DONE** | Complete |
| Payment methods | YES | YES (`CollectPaymentPanel`) | **DONE** | Complete |
| Discount types | YES | PARTIAL | **PARTIAL** | |
| Printers | YES | NO (Phase 2 — KOT/Bill print) | **MISSING** | Phase 2 |
| Schedules | YES | NO (not displayed) | **MISSING** | Low priority |
| Settings | YES | PARTIAL | **PARTIAL** | |
| **Cancellation settings** | **YES** | **NO** | **PARTIAL** | Transform done, UI time-window checks missing |

### Handler Wiring Status

| Handler | Component | API Endpoint | Status |
|---------|-----------|-------------|--------|
| `onCancelOrder` | `OrderCard` → `DashboardPage` | `PUT /api/v2/vendoremployee/order-status-update` | **MAPPED** — Opens `CancelOrderModal`, calls API on confirm |
| `onItemStatusChange` | `OrderCard` → `DashboardPage` | `PUT /api/v2/vendoremployee/food-status-update` | **MAPPED** — Calls food status update API directly |
| `onMarkReady` | `OrderCard` → `DashboardPage` | `PUT /api/v2/vendoremployee/order-status-update` | **MAPPED** — Calls `updateOrderStatus(orderId, roleName, 'ready')` |
| `onMarkServed` | `OrderCard` → `DashboardPage` | `PUT /api/v2/vendoremployee/order-status-update` | **MAPPED** — Calls `updateOrderStatus(orderId, roleName, 'serve')` |
| `onMergeOrder` | `OrderCard` → `DashboardPage` | `POST /api/v1/vendoremployee/order/transfer-order` | **STUB** — Console.log only, modal not wired from list view |
| `onTableShift` | `OrderCard` → `DashboardPage` | `POST /api/v1/vendoremployee/pos/order-table-room-switch` | **STUB** — Console.log only, modal not wired from list view |
| `onFoodTransfer` | `OrderCard` → `DashboardPage` | `POST /api/v1/vendoremployee/order/transfer-food-item` | **STUB** — Console.log only, modal not wired from list view |
| `onEdit` | `OrderCard` → `DashboardPage` | N/A (opens OrderEntry) | **MAPPED** — Opens `OrderEntry` via `handleTableClick` |
| `onBillClick` | `OrderCard` → `DashboardPage` | N/A (opens OrderEntry with payment) | **MAPPED** — Opens `OrderEntry` via `handleBillClick` (disabled Phase 2) |

---

## 11. Action → Permission → Component Matrix

This is the master reference for which UI actions need which permission checks and where.

### OrderCard.jsx (Dashboard Cards)

| UI Element | Location in Card | Permission Required | Additional Condition | Status |
|------------|-----------------|---------------------|---------------------|--------|
| **Cancel Order [X]** | Footer left | `order_cancel` | `cancel_order_time` not expired | **MAPPED** — Gated via `canCancelOrder` prop. Time-window check: **MISSING** |
| **Merge Order** | Header right | `table_merge` | Dine-In only, not YetToConfirm | **MAPPED** — Gated via `canMergeOrder` prop |
| **Table Shift** | Header right | `table_shift` | Dine-In only, not YetToConfirm | **MAPPED** — Gated via `canShiftTable` prop |
| **Food Transfer** | Item row left | `food_transfer` | Dine-In only, not YetToConfirm | **MAPPED** — Gated via `canFoodTransfer` prop |
| **Card tap → Edit** | Entire card | `order_edit` | Not engaged | **MISSING** — Always clickable |
| **Ready button** | Footer right | `order_view` (implicit) | `fOrderStatus === 1` | **MAPPED** — Always visible (implicit permission) |
| **Serve button** | Footer right | `order_view` (implicit) | `fOrderStatus === 2` | **MAPPED** — Always visible (implicit permission) |
| **Bill button** | Footer right | `bill_collect` | `fOrderStatus === 5` | **MISSING** — Permission not gated (disabled for Phase 2) |
| **KOT button** | Footer left | `kot_print` | Always present | **MISSING** — Permission not gated (disabled for Phase 2) |
| **Item Ready/Serve toggle** | Item row right | `order_view` (implicit) | Dine-In only | **MAPPED** — Handler wired via `onItemStatusChange` |

### OrderEntry.jsx (Order Taking Panel)

| UI Element | Permission Required | Additional Condition | Status |
|------------|---------------------|---------------------|--------|
| Add items to cart | `order_edit` | — | **MISSING** |
| Cancel food item | `food_cancel` | `cancel_food_timings` not expired | **MISSING** |
| Cancel full order | `order_cancel` | `cancel_order_time` not expired | **MISSING** |
| Shift table | `table_shift` | Dine-In only | **MISSING** |
| Merge order | `table_merge` | Dine-In only | **MISSING** |
| Transfer food | `food_transfer` | Dine-In only | **MISSING** |
| Collect payment | `bill_collect` | Order must be placed | **MISSING** |
| Apply discount | `discount_apply` | — | **MISSING** |
| Complementary item | `complementary_apply` | — | **MISSING** |
| Customer search | `customer_manage` | — | **MISSING** |

### Sidebar / Navigation

| UI Element | Permission Required | Status |
|------------|---------------------|--------|
| Menu Management | `menu_manage` | **MISSING** |
| Reports | `report_view` | **MISSING** |
| Settings | `settings_manage` | **MISSING** |
| Employee Management | `employee_manage` | **MISSING** |

---

## Quick Reference: Implementation Checklist

- [x] **Transform**: Add cancellation settings to `profileTransform.js` → `fromAPI.restaurant()`
- [x] **Transform**: Store cancellation config in `RestaurantContext` for UI access
- [x] **OrderCard.jsx**: Wrap Cancel button with `hasPermission('order_cancel')` via `canCancelOrder` prop
- [x] **OrderCard.jsx**: Wrap Merge button with `hasPermission('table_merge')` via `canMergeOrder` prop
- [x] **OrderCard.jsx**: Wrap Shift button with `hasPermission('table_shift')` via `canShiftTable` prop
- [x] **OrderCard.jsx**: Wrap Food Transfer icon with `hasPermission('food_transfer')` via `canFoodTransfer` prop
- [x] **DashboardPage.jsx**: Wire `onCancelOrder` handler → `CancelOrderModal` → API
- [x] **DashboardPage.jsx**: Wire `onItemStatusChange` handler → `FOOD_STATUS_UPDATE` API
- [ ] **OrderCard.jsx**: Add `cancel_order_time` elapsed check for Cancel button
- [ ] **OrderEntry.jsx**: Add permission gates to modal triggers (Cancel, Shift, Merge, Transfer)
- [ ] **Sidebar.jsx**: Add permission gates to navigation links (Menu, Reports, Settings)
- [ ] **OrderCard.jsx**: Gate `onEdit` (card tap) with `order_edit` permission
- [ ] **OrderCard.jsx**: Gate Bill button with `bill_collect` permission (after Phase 2)

---

*This document should be updated as new permissions are discovered from the API or as UI components are gated.*
