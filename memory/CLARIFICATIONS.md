# POS Frontend - Clarifications & Questions for Backend/Product Team

**Last Updated:** April 7, 2026  
**Purpose:** Consolidate all open questions, hardcodings, missing specifications, and clarifications needed from the team before implementation can proceed.

---

## Table of Contents
1. [Critical - Order Type Differentiation](#1-critical---order-type-differentiation)
2. [Critical - Socket Events Inconsistency](#2-critical---socket-events-inconsistency)
3. [Critical - Multi-Device Race Conditions](#3-critical---multi-device-race-conditions)
4. [API Field Clarifications](#4-api-field-clarifications)
5. [Hardcoded Values Needing Specification](#5-hardcoded-values-needing-specification)
6. [Not Implemented Features](#6-not-implemented-features)
7. [Socket Channel Questions](#7-socket-channel-questions)
8. [Data Inconsistency Issues](#8-data-inconsistency-issues)
9. [UI/UX Clarifications](#9-uiux-clarifications)
10. [Endpoint Clarifications](#10-endpoint-clarifications)

---

## 1. Critical - Order Type Differentiation

### CLARIFICATION-001: How should `order_type` be set for different order modes?

**Current State (HARDCODED):**
```javascript
// orderTransform.js - ALL orders send "pos" regardless of actual type
order_type: 'pos'  // Lines 413, 481, 533
```

**Impact:**
- User selects "TakeAway" → payload sends `order_type: "pos"` → backend stores as "pos"
- User selects "Delivery" → payload sends `order_type: "pos"` → backend stores as "pos"
- User selects "Walk-In" → payload sends `order_type: "pos"` → backend stores as "pos"
- **All non-table orders appear as "WC" (Walk-In Counter) in Table View**

**Questions:**
1. What are the exact `order_type` values expected by backend for each mode?
   - Dine-In (with table): `?`
   - Walk-In (no table): `?`
   - TakeAway: `?`
   - Delivery: `?`
   - Room Service: `?`
2. Is `order_type` used for reporting/analytics? If so, the current hardcoding breaks all reports.
3. Should frontend derive `order_type` from user selection, or should backend infer from `table_id`?

**Expected Answer Format:**
| User Selection | table_id | order_type to send |
|----------------|----------|-------------------|
| Dine-In | 4271 | `"pos"` or `"dinein"` |
| Walk-In | 0 | `"WalkIn"` or `"pos"` |
| TakeAway | 0 | `"take_away"` |
| Delivery | 0 | `"delivery"` |

---

### CLARIFICATION-002: How does frontend know which order type user selected?

**Current State:**
- OrderEntry receives `orderType` parameter but it's **IGNORED** in payload builder
- UI for selecting order type (Dine-In / TakeAway / Delivery / Walk-In) needs verification

**Questions:**
1. Where in the UI does user select order type before placing order?
2. Is there a separate flow for TakeAway vs Delivery vs Walk-In?
3. Should Walk-In be selectable, or is it auto-inferred when `table_id = 0`?

---

## 2. Critical - Socket Events Inconsistency

### CLARIFICATION-003: Why does backend NOT send `update-table engage` for new orders?

**Documented in:** BUG-211

**Current Behavior:**
| Flow | `update-table engage` sent? |
|------|----------------------------|
| Place New Order | ❌ NO |
| Update Order | ✅ YES |
| Place+Pay | ❌ NO |

**Question:**
Is this intentional? If not, can backend send `update-table engage` for new orders?

---

### CLARIFICATION-004: Why does backend send `free` without prior `engage` for some flows?

**Documented in:** BUG-216, BUG-221

**Affected Flows:**
- Cancel Item → sends `update-table free` (no prior engage)
- Shift Table → source table gets `free` (no prior engage)
- Merge Order → source table gets `free` (no prior engage)

**Impact:**
Frontend workaround (treating `free` as `engage`) breaks Shift/Merge flows.

**Question:**
Can backend follow consistent pattern: `engage → process → free` for ALL table-modifying operations?

---

### CLARIFICATION-005: Socket `new-order` missing 16 financial fields

**Documented in:** BUG-204 (Extended)

**Missing from socket, present in GET API:**
- `order_sub_total_amount`
- `order_sub_total_without_tax`
- `total_service_tax_amount`
- `payment_method`
- `delivery_charge`
- ... 11 more fields

**Question:**
Can these fields be added to socket `new-order` payload to avoid mandatory GET API call after every new order?

---

## 3. Critical - Multi-Device Race Conditions

### CLARIFICATION-006: How to prevent two users ordering on same table?

**Documented in:** BUG-210

**Current State:**
No pre-check before placing order. Two POS terminals can place orders on same table simultaneously.

**Questions:**
1. Should frontend call `GET /all-table-list` and check `engage` field before placing order?
2. Is there a dedicated endpoint to check single table availability?
3. Should backend reject place-order if table already has active order?

---

### CLARIFICATION-007: Race condition when multiple socket events arrive for same order

**Documented in:** API_MAPPING_AUDIT Section 7

**Scenario:**
- T+0ms: `update-order` fires → API call #1 starts
- T+200ms: `update-food-status` fires → API call #2 starts
- T+400ms: API call #2 returns (NEWER) → context updated ✅
- T+600ms: API call #1 returns (OLDER) → context updated ❌ **overwrites newer**

**Questions:**
1. Can socket events include `updated_at` timestamp for staleness check?
2. Can backend coalesce events (if multiple events fire within 500ms, send only final state)?
3. Can `update-order` include full payload (like `new-order` does)?

---

## 4. API Field Clarifications

### CLARIFICATION-008: `order_sub_total_without_tax` always returns 0

**Documented in:** BUG-204

**Question:**
Is this a known backend bug? When will it be fixed?

---

### CLARIFICATION-009: What is the difference between these financial fields?

| Field | Our Understanding | Confirm? |
|-------|-------------------|----------|
| `order_sub_total_amount` | Sum of all items (base + addons + variations) × qty | ? |
| `order_sub_total_without_tax` | Same as above? Or excludes inclusive tax? | ? |
| `order_amount` | Final payable (subtotal + tax + round_up) | ? |
| `tax_amount` | `gst_tax + vat_tax` | ? |

---

### CLARIFICATION-010: Cancel item `cancel_type` values

**Current Code:**
```javascript
cancel_type: item.status === 'preparing' ? 'Pre-Serve' : 'Post-Serve'
```

**Questions:**
1. Are `"Pre-Serve"` and `"Post-Serve"` the correct exact values?
2. Is cancel_type based on item status or something else (e.g., kitchen stage)?
3. Does cancel_type affect billing/refund logic?

---

### CLARIFICATION-011: What triggers `f_order_status` transitions?

| Status | Value | Trigger |
|--------|-------|---------|
| Queue/Preparing | 1 | ? |
| Ready | 2 | Kitchen marks ready? |
| Cancelled | 3 | Cancel API call |
| ? | 4 | ? |
| Served/Bill Ready | 5 | Waiter marks served? |
| Paid | 6 | Payment collected |
| Yet to Confirm | 7 | QR/aggregator order? |
| ? | 8 | ? |

**Questions:**
1. What are statuses 4 and 8?
2. What's the full status transition diagram?

---

## 5. Hardcoded Values Needing Specification

### CLARIFICATION-012: Hardcoded `order_type: 'pos'`

**Location:** `orderTransform.js` lines 413, 481, 533

**Question:** Should this be dynamic based on user selection? (See CLARIFICATION-001)

---

### CLARIFICATION-013: Hardcoded `auto_dispatch: 'No'`

**Location:** `orderTransform.js`

**Questions:**
1. When should this be `'Yes'`?
2. Is this used for delivery orders?

---

### CLARIFICATION-014: Hardcoded `scheduled: 0`, `schedule_at: null`

**Questions:**
1. How should scheduled orders work?
2. What datetime format does backend expect for `schedule_at`?

---

### CLARIFICATION-015: Hardcoded financial fields

| Field | Hardcoded Value | Question |
|-------|-----------------|----------|
| `service_tax` | 0 | When is service tax applied? How to calculate? |
| `service_gst_tax_amount` | 0 | GST on service tax? |
| `tip_tax_amount` | 0 | Is tip taxable? |
| `used_loyalty_point` | 0 | How do loyalty points work? |
| `use_wallet_balance` | 0 | How does wallet work? |
| `complementary_price` | 0 | How to mark item as complimentary? |
| `is_complementary` | "No" | Same as above |
| `discount_amount` (per item) | "0.00" | How to apply per-item discount? |

---

### CLARIFICATION-016: Hardcoded room fields

| Field | Hardcoded Value | Question |
|-------|-----------------|----------|
| `paid_room` | null | What is paid room? |
| `room_id` | null | When to send room_id? |
| `address_id` | null | When to send for delivery? |

---

## 6. Not Implemented Features

### CLARIFICATION-017: Partial Payments (Split Pay)

**Documented in:** API_DOCUMENT_V2.md

**Current State:** `partial_payments` array is documented but NOT implemented.

**Questions:**
1. What is the exact payload structure for split payment?
2. Can you share a working curl example?
3. Should frontend allow multiple payment methods in single transaction?

---

### CLARIFICATION-018: Audio File Attachment

**Field:** `audiofile` in place-order FormData

**Questions:**
1. What is this used for?
2. Should it be implemented? What's the use case?

---

### CLARIFICATION-019: Member/Loyalty Discounts

**Fields:** `discount_member_category_id`, `discount_member_category_name`

**Questions:**
1. How does member discount work?
2. Where does user select member category?
3. How is discount calculated?

---

### CLARIFICATION-020: Edit Placed Item

**Location:** `OrderEntry.jsx` line 321 - TODO CHG-040

**Questions:**
1. What is the endpoint for editing placed item qty/notes?
2. What's the payload structure?
3. Can price be edited?

---

## 7. Socket Channel Questions

### CLARIFICATION-021: Is `update-table` channel necessary?

**Documented in:** API_MAPPING_AUDIT Section 8

**Current State:**
Server emits on 2 channels for every order action:
- `new_order_{restaurantId}` - order events
- `update_table_{restaurantId}` - table events

**Questions:**
1. Is there ANY situation where table status changes WITHOUT an order event?
2. Can frontend safely ignore `update-table` and derive status from order data?
3. This would eliminate dual-source table status problem.

---

### CLARIFICATION-022: Socket event payload differences

| Event | Full Payload? | Notes |
|-------|--------------|-------|
| `new-order` | ✅ Yes (35 keys) | Missing 16 financial fields |
| `update-order` | ❌ No | Must call GET API |
| `update-food-status` | ❌ No | Must call GET API |
| `update-order-status` | ❌ No | Must call GET API |

**Question:**
Can ALL order events include full payload to eliminate GET API calls?

---

## 8. Data Inconsistency Issues

### CLARIFICATION-023: Addon names differ between Product API and Order API

**Documented in:** BUG-212

**Example:**
| Addon ID | Product Catalog API | Order Response API |
|----------|--------------------|--------------------|
| 10725 | Garlic mayo | Garlic Sauce |
| 10728 | Thandoori sauce | Tandoori sauce |

**Questions:**
1. Why do names differ for same addon ID?
2. Which is the source of truth?
3. Can backend ensure consistency?

---

### CLARIFICATION-024: GET API returns cancelled order with non-cancelled items

**Documented in:** BUG-215

**Question:**
When full order is cancelled (`f_order_status: 3`), should individual item statuses also be set to `cancelled`?

---

## 9. UI/UX Clarifications

### CLARIFICATION-025: How should Walk-In orders be initiated?

**Current Issue:**
User reports: "I am not able to choose walk in while ordering, it selects first table number"

**Questions:**
1. Is there a dedicated "Walk-In" button on dashboard?
2. Should Walk-In skip table selection entirely?
3. What is the intended UX flow for Walk-In?

---

### CLARIFICATION-026: Order type visual differentiation in Table View

**Current Spec (from code):**
| Order Type | Header Background | Icon |
|------------|-------------------|------|
| Dine-In | Gray #E5E7EB | None |
| Walk-In | Gray #E5E7EB | None |
| TakeAway | Amber #FFF3E0 | ShoppingBag |
| Delivery | Blue #E3F2FD | Bike |

**Questions:**
1. Is this the correct visual spec?
2. Should Walk-In have a distinct icon/color to differentiate from Dine-In?
3. Should Room have a distinct icon?

---

### CLARIFICATION-027: Status border colors removed?

**User Request:**
"remove border colors" (status-based border colors on table cards)

**Questions:**
1. Confirm: Replace all status-based borders with neutral gray?
2. How should order status be indicated instead?

---

## 10. Endpoint Clarifications

### CLARIFICATION-028: Is there a single-table availability check endpoint?

**Current State:**
Must call `GET /all-table-list` and filter to check one table's `engage` status.

**Question:**
Is there a `GET /table/{id}` or `GET /table-status/{id}` endpoint?

---

### CLARIFICATION-029: TBD Endpoints in constants.js

| Constant | Current Value | Question |
|----------|---------------|----------|
| `EDIT_ORDER_ITEM` | TBD | What is the endpoint? |
| `EDIT_ORDER_ITEM_QTY` | TBD | What is the endpoint? |

---

### CLARIFICATION-030: Correct endpoint versions

**Confusion:**
- Some endpoints are v1, some v2
- Some v2 endpoints don't work (e.g., `/v2/cancel-food-item` ignores `cancel_qty`)

**Question:**
Can you provide authoritative list of correct endpoint versions for each action?

---

## Summary - Priority Order

### P0 - Blocking (Must resolve before launch)
1. **CLARIFICATION-001** - Order type hardcoding (all orders show as WC)
2. **CLARIFICATION-006** - Multi-device race condition (two orders on same table)
3. **CLARIFICATION-023** - Addon name mismatch (confuses kitchen/customer)

### P1 - High Priority
4. CLARIFICATION-003/004 - Socket engage/free inconsistency
5. CLARIFICATION-005 - Socket missing financial fields
6. CLARIFICATION-011 - Status transition diagram

### P2 - Medium Priority
7. CLARIFICATION-008 - `order_sub_total_without_tax` returns 0
8. CLARIFICATION-017 - Partial payments spec
9. CLARIFICATION-025 - Walk-In UX flow

### P3 - Low Priority (Documentation)
10. All hardcoded value clarifications
11. Not implemented feature specs
12. Endpoint version clarifications

---

## Action Items

| # | Owner | Action |
|---|-------|--------|
| 1 | Backend Team | Answer CLARIFICATION-001 (order_type values) |
| 2 | Backend Team | Fix BUG-204 (order_sub_total_without_tax) |
| 3 | Backend Team | Fix BUG-212 (addon name mismatch) |
| 4 | Backend Team | Add `engage` to socket events (BUG-211, 216) |
| 5 | Product Team | Confirm Walk-In UX flow |
| 6 | Product Team | Confirm order type visual differentiation |
| 7 | Frontend Team | Update payload once CLARIFICATION-001 is answered |

---

*Document created: April 7, 2026*
*This document should be reviewed with backend and product teams before proceeding with fixes.*
