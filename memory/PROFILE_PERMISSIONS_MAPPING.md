# Profile API — User Roles, Permissions & Restaurant Settings Mapping

**Version:** 1.0
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

| Permission String | Description | UI Component(s) Affected | Visibility Rule |
|-------------------|-------------|--------------------------|-----------------|
| `order_cancel` | Cancel entire order | `OrderCard` → Cancel [X] button (footer) | Hide button if missing |
| `food_cancel` | Cancel individual food item | `OrderCard` → Cancel item action (if present), `OrderEntry` → `CancelFoodModal` | Hide item cancel if missing |
| `order_edit` | Edit/update an existing order (add items) | `OrderCard` → tap to open `OrderEntry`, `OrderEntry` → add items flow | Disable card tap or hide edit controls |
| `order_view` | View orders on dashboard | `DashboardPage` → Order View tab | Hide Order View entirely if missing |
| `table_shift` | Shift order to another table | `OrderCard` → Shift button (header), `OrderEntry` → `ShiftTableModal` | Hide shift button if missing |
| `table_merge` | Merge orders from two tables | `OrderCard` → Merge button (header), `OrderEntry` → `MergeTableModal` | Hide merge button if missing |
| `food_transfer` | Transfer item to another table's order | `OrderCard` → Food Transfer icon (item row), `OrderEntry` → `TransferFoodModal` | Hide transfer icon if missing |
| `bill_collect` | Collect payment / settle bill | `OrderCard` → Bill button (footer), `OrderEntry` → `CollectPaymentPanel` | Hide bill button if missing |
| `bill_print` | Print bill receipt | `OrderCard` → Bill print action (Phase 2) | Disable print if missing |
| `kot_print` | Print Kitchen Order Ticket | `OrderCard` → KOT button (footer, Phase 2) | Disable KOT if missing |
| `discount_apply` | Apply manual/coupon discounts | `OrderEntry` → Discount section | Hide discount controls if missing |
| `complementary_apply` | Mark item as complementary | `OrderEntry` → Complementary toggle | Hide complementary option if missing |
| `customer_manage` | Search/add customers | `OrderEntry` → `CustomerModal` | Disable customer button if missing |
| `menu_manage` | Manage menu items | Sidebar → Menu Management | Hide menu management link if missing |
| `report_view` | View reports/analytics | Sidebar → Reports, `AllOrdersReportPage` | Hide reports link if missing |
| `settings_manage` | Access settings | Sidebar → Settings, `SettingsPanel` | Hide settings link if missing |
| `employee_manage` | Manage employees | Sidebar → Employee section | Hide employee management if missing |
| `table_manage` | Manage table layout | Sidebar → Table management | Hide table management if missing |
| `room_manage` | Manage rooms | Sidebar → Room section | Hide room management if missing |
| `printer_manage` | Manage printers | Settings → Printer config | Hide printer settings if missing |

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
**NOT YET MAPPED** in `profileTransform.js`. These fields exist in the raw API response but are not extracted by the `fromAPI.restaurant()` transform function.

### Proposed Transform Addition
```javascript
// In profileTransform.js → fromAPI.restaurant()
cancellation: {
  allowPostServeCancel: toBoolean(api.cancle_post_serve),         // Note: API has typo "cancle"
  allowPostServeCancel2: toBoolean(api.allow_cancel_post_server), // Redundant gate
  orderCancelWindowMinutes: parseInt(api.cancel_order_time) || 0, // 0 = unlimited
  itemCancelWindowMinutes: parseInt(api.cancel_food_timings) || 0, // 0 = unlimited
},
```

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

| Area | Mapped in Transform? | Consumed in UI? | Notes |
|------|---------------------|-----------------|-------|
| User identity | YES | YES (Sidebar, Header) | Complete |
| Role name (`role_name`) | YES | YES (sent in API calls) | Complete |
| Permissions array (`role`) | YES (stored as flat array) | NO (not checked in components) | **Needs implementation** |
| Restaurant features | YES | PARTIAL (dineIn/delivery/takeaway used in filtering) | |
| Restaurant tax | YES | YES (order calculations) | Complete |
| Payment methods | YES | YES (`CollectPaymentPanel`) | Complete |
| Discount types | YES | PARTIAL | |
| Printers | YES | NO (Phase 2 — KOT/Bill print) | |
| Schedules | YES | NO (not displayed) | |
| Settings | YES | PARTIAL | |
| **Cancellation settings** | **NO** | **NO** | **Needs transform + UI** |

---

## 11. Action → Permission → Component Matrix

This is the master reference for which UI actions need which permission checks and where.

### OrderCard.jsx (Dashboard Cards)

| UI Element | Location in Card | Permission Required | Additional Condition | Current State |
|------------|-----------------|---------------------|---------------------|---------------|
| **Cancel Order [X]** | Footer left | `order_cancel` | `cancel_order_time` not expired | Shows unconditionally |
| **Merge Order** | Header right | `table_merge` | Dine-In only, not YetToConfirm | Shows for all Dine-In |
| **Table Shift** | Header right | `table_shift` | Dine-In only, not YetToConfirm | Shows for all Dine-In |
| **Food Transfer** | Item row left | `food_transfer` | Dine-In only, not YetToConfirm | Shows for all Dine-In |
| **Card tap → Edit** | Entire card | `order_edit` | Not engaged | Always clickable |
| **Ready button** | Footer right | `order_view` (implicit) | `fOrderStatus === 1` | Shows unconditionally |
| **Serve button** | Footer right | `order_view` (implicit) | `fOrderStatus === 2` | Shows unconditionally |
| **Bill button** | Footer right | `bill_collect` | `fOrderStatus === 5` | Shows but disabled (Phase 2) |
| **KOT button** | Footer left | `kot_print` | Always present | Shows but disabled (Phase 2) |
| **Item Ready/Serve toggle** | Item row right | `order_view` (implicit) | Dine-In only | Shows unconditionally |

### OrderEntry.jsx (Order Taking Panel)

| UI Element | Permission Required | Additional Condition |
|------------|---------------------|---------------------|
| Add items to cart | `order_edit` | — |
| Cancel food item | `food_cancel` | `cancel_food_timings` not expired |
| Cancel full order | `order_cancel` | `cancel_order_time` not expired |
| Shift table | `table_shift` | Dine-In only |
| Merge order | `table_merge` | Dine-In only |
| Transfer food | `food_transfer` | Dine-In only |
| Collect payment | `bill_collect` | Order must be placed |
| Apply discount | `discount_apply` | — |
| Complementary item | `complementary_apply` | — |
| Customer search | `customer_manage` | — |

### Sidebar / Navigation

| UI Element | Permission Required |
|------------|---------------------|
| Menu Management | `menu_manage` |
| Reports | `report_view` |
| Settings | `settings_manage` |
| Employee Management | `employee_manage` |

---

## Quick Reference: Implementation Checklist

- [ ] **Transform**: Add cancellation settings to `profileTransform.js` → `fromAPI.restaurant()`
- [ ] **Transform**: Store cancellation config in `RestaurantContext` for UI access
- [ ] **OrderCard.jsx**: Wrap Cancel button with `hasPermission('order_cancel')`
- [ ] **OrderCard.jsx**: Wrap Merge button with `hasPermission('table_merge')`
- [ ] **OrderCard.jsx**: Wrap Shift button with `hasPermission('table_shift')`
- [ ] **OrderCard.jsx**: Wrap Food Transfer icon with `hasPermission('food_transfer')`
- [ ] **OrderCard.jsx**: Add `cancel_order_time` elapsed check for Cancel button
- [ ] **OrderEntry.jsx**: Add permission gates to modal triggers
- [ ] **Sidebar.jsx**: Add permission gates to navigation links

---

*This document should be updated as new permissions are discovered from the API or as UI components are gated.*
