import { useState } from "react";
import { User, X, ChevronDown, ChevronUp, MapPin, Clock, Printer, ShoppingBag, Bike, Circle, CheckCircle2, Check } from "lucide-react";
import { COLORS, SOURCE_COLORS } from "../../constants";

/**
 * Unified Order Card - Handles Dine-In, TakeAway, Delivery, Room
 * Compact design for Order View (4 cards per row, 280px min-width)
 * 
 * REDESIGNED: April 2026
 * - Header: Colored background (Yellow/Green/Pink/Blue) + MG logo + Customer + Cancel
 * - Items: Simple display WITH item-level Ready/Serve buttons
 * - Footer: Dynamic based on fOrderStatus, 44px touch targets
 */
const OrderCard = ({
  order,
  orderType,
  tableLabel,
  isSnoozed,
  onToggleSnooze,
  onEdit,
  onMarkReady,
  onMarkServed,
  onBillClick,
  onCancelOrder,
  onCancelItem,
  onAccept,
  onReject,
  onItemStatusChange,
}) => {
  const [showServed, setShowServed] = useState(false);
  const [showAddress, setShowAddress] = useState(false);

  if (!order) return null;

  const source = order.source || "own";
  const isOwn = source === "own";
  const isDineIn = orderType === "dineIn";
  const isDelivery = orderType === "delivery";
  const isTakeAway = orderType === "takeAway";
  const isRoom = orderType === "room" || order.isRoom;
  const orderId = order.orderId || order.id;
  const fOrderStatus = order.fOrderStatus || 1;

  // Items grouped by status
  const items = order.items || [];
  const activeItems = items.filter(i => i.status !== "served" && i.status !== "cancelled");
  const servedItems = items.filter(i => i.status === "served");

  const isYetToConfirm = order.status === "yetToConfirm" || order.status === "pending";

  // Header background color based on order type (matching TableCard)
  const getHeaderBgColor = () => {
    if (isRoom) return '#E3F2FD';           // Blue for Room
    if (isTakeAway) return '#C8E6C9';       // Green for Take Away
    if (isDelivery) return '#FFEBEE';       // Pink for Delivery
    return '#FFF9E6';                        // Yellow for Dine-In (default)
  };

  // Order type label for header
  const getOrderTypeLabel = () => {
    if (isRoom) return "Room";
    if (isDineIn) return "Dine In";
    if (isTakeAway) return "Take Away";
    if (isDelivery) return "Delivery";
    return "";
  };

  // Customer name display - fallback to "Walk-In" or "WC"
  const getCustomerName = () => {
    if (order.customer && order.customer.trim()) {
      return order.customer;
    }
    return isDineIn ? "WC" : "Walk-In";
  };

  // Source logo - MG text for own, letter for aggregators
  const renderLogo = () => {
    if (isOwn) {
      return (
        <div
          className="w-6 h-6 rounded flex items-center justify-center font-bold text-white text-[10px] flex-shrink-0"
          style={{ backgroundColor: COLORS.primaryGreen }}
        >
          MG
        </div>
      );
    }
    const color = SOURCE_COLORS[source] || SOURCE_COLORS.own;
    const letter = source === "swiggy" ? "S" : source === "zomato" ? "Z" : "O";
    return (
      <div
        className="w-6 h-6 rounded flex items-center justify-center font-bold text-white text-[10px] flex-shrink-0"
        style={{ backgroundColor: color }}
      >
        {letter}
      </div>
    );
  };

  // Get order type icon
  const renderOrderTypeIcon = () => {
    if (isTakeAway) return <ShoppingBag className="w-3.5 h-3.5 flex-shrink-0" style={{ color: COLORS.primaryOrange }} />;
    if (isDelivery) return <Bike className="w-3.5 h-3.5 flex-shrink-0" style={{ color: COLORS.primaryOrange }} />;
    return null;
  };

  // Get item dot color based on status
  const getItemDotColor = (item) => {
    if (item.status === 'preparing') return COLORS.primaryOrange;
    if (item.status === 'ready') return COLORS.primaryGreen;
    return COLORS.grayText;
  };

  // Get item action icon config based on item status
  // ○ Empty circle (orange) = Preparing → tap to mark Ready
  // ◉ Filled circle (green) = Ready → tap to mark Serve
  const getItemActionConfig = (item) => {
    if (item.status === 'preparing') return { action: 'ready', color: COLORS.primaryOrange, icon: 'empty' };
    if (item.status === 'ready') return { action: 'serve', color: COLORS.primaryGreen, icon: 'filled' };
    return null;
  };

  // Handle item action (Ready/Serve)
  const handleItemAction = (item, action) => {
    console.log(`[OrderCard] ${action} item ${item.id} on order ${orderId}`);
    if (onItemStatusChange) {
      onItemStatusChange(order, item, action.toLowerCase());
    }
  };

  return (
    <div
      data-testid={`order-card-${orderId}`}
      className={`rounded-lg shadow-sm overflow-hidden ${isSnoozed ? "opacity-60" : ""}`}
      style={{ backgroundColor: COLORS.lightBg, border: `1px solid ${COLORS.borderGray}` }}
      onClick={() => onEdit?.()}
    >
      {/* ── HEADER — Colored background based on order type ── */}
      <div
        className="px-3 py-2 flex items-center gap-2"
        style={{ backgroundColor: getHeaderBgColor() }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Logo */}
        {renderLogo()}

        {/* Order Type Icon + Label */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {renderOrderTypeIcon()}
          <span className="text-xs font-semibold" style={{ color: COLORS.darkText }}>
            {getOrderTypeLabel()}
          </span>
        </div>

        {/* Customer Name + Time */}
        <div className="flex-1 min-w-0 flex items-center gap-1">
          <span className="text-xs font-medium truncate" style={{ color: COLORS.darkText }}>
            {getCustomerName()}
          </span>
          <span className="text-[10px] flex-shrink-0" style={{ color: COLORS.grayText }}>
            · {order.time || ''}
          </span>
        </div>

        {/* Amount */}
        <span className="font-bold text-sm flex-shrink-0" style={{ color: COLORS.primaryOrange }}>
          ₹{(order.amount || 0).toLocaleString()}
        </span>

        {/* Snooze Button - Only for Yet to Confirm orders (44px touch target) */}
        {isYetToConfirm && onToggleSnooze && (
          <button
            data-testid={`snooze-btn-${orderId}`}
            onClick={(e) => { 
              e.stopPropagation(); 
              onToggleSnooze(String(orderId)); 
            }}
            className={`min-h-[44px] min-w-[44px] rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${isSnoozed ? "bg-orange-100" : "hover:bg-white/50"}`}
            title={isSnoozed ? "Unsnooze" : "Snooze"}
          >
            <Clock className="w-5 h-5" style={{ color: isSnoozed ? COLORS.primaryOrange : COLORS.grayText }} />
          </button>
        )}

        {/* Order-level Cancel Button (44px touch target) */}
        {!isYetToConfirm && onCancelOrder && (
          <button
            data-testid={`cancel-order-btn-${orderId}`}
            onClick={(e) => {
              e.stopPropagation();
              onCancelOrder(order);
            }}
            className="min-h-[44px] min-w-[44px] hover:bg-white/50 rounded-lg flex items-center justify-center flex-shrink-0"
            title="Cancel Order"
          >
            <X className="w-5 h-5" style={{ color: COLORS.errorText }} />
          </button>
        )}

        {/* Address toggle for own delivery (44px touch target) */}
        {isDelivery && isOwn && (
          <button
            data-testid={`address-btn-${orderId}`}
            className="min-h-[44px] min-w-[44px] hover:bg-white/50 rounded-lg flex items-center justify-center flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setShowAddress(!showAddress);
            }}
            title="View address"
          >
            <MapPin className="w-5 h-5" style={{ color: COLORS.grayText }} />
          </button>
        )}
      </div>

      {/* ── ADDRESS POPUP (own delivery) ── */}
      {showAddress && isDelivery && isOwn && (
        <div 
          className="px-3 py-1.5 border-b text-[10px]" 
          style={{ borderColor: COLORS.borderGray, backgroundColor: COLORS.sectionBg }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-1.5">
            <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: COLORS.primaryOrange }} />
            <span style={{ color: COLORS.darkText }}>
              {order.deliveryAddress?.formatted || order.deliveryAddress?.address || "No address"}
            </span>
          </div>
        </div>
      )}

      {/* ── ITEMS SECTION — Compact with status label + tick icons ── */}
      <div className="px-3 py-1.5 border-b" style={{ borderColor: COLORS.borderGray }}>
        {activeItems.length > 0 ? (
          activeItems.map((item) => {
            const actionConfig = getItemActionConfig(item);
            const statusLabel = item.status === 'preparing' ? 'Preparing' : item.status === 'ready' ? 'Ready' : '';
            return (
              <div key={item.id} className="flex items-center gap-2 py-1.5">
                {/* Status dot */}
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getItemDotColor(item) }}
                />
                {/* Item name + qty */}
                <span className="flex-1 text-xs truncate" style={{ color: COLORS.darkText }}>
                  {item.name} ({item.qty})
                </span>
                {/* Status label */}
                {statusLabel && (
                  <span className="text-[10px] flex-shrink-0" style={{ color: COLORS.grayText }}>
                    {statusLabel}
                  </span>
                )}
                {/* Item-level tick icon (44px touch target) */}
                {actionConfig && (
                  <button
                    data-testid={`item-action-btn-${item.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleItemAction(item, actionConfig.action);
                    }}
                    className="min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors -mr-2"
                    title={actionConfig.action === 'ready' ? 'Mark Ready' : 'Mark Served'}
                  >
                    {actionConfig.icon === 'empty' ? (
                      <Circle className="w-5 h-5" style={{ color: actionConfig.color }} strokeWidth={2.5} />
                    ) : (
                      <CheckCircle2 className="w-5 h-5" style={{ color: actionConfig.color }} strokeWidth={2.5} />
                    )}
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-1.5 text-xs" style={{ color: COLORS.grayText }}>
            No active items
          </div>
        )}
      </div>

      {/* ── SERVED ITEMS COLLAPSED (44px touch target for toggle) ── */}
      {servedItems.length > 0 && (
        <div className="border-b" style={{ borderColor: COLORS.borderGray }}>
          <button
            data-testid={`served-toggle-${orderId}`}
            className="w-full px-3 min-h-[40px] flex items-center justify-between text-xs hover:bg-gray-50"
            style={{ color: COLORS.grayText }}
            onClick={(e) => {
              e.stopPropagation();
              setShowServed(!showServed);
            }}
          >
            <span>▼ Served ({servedItems.length})</span>
            {showServed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showServed && (
            <div className="px-3 pb-2">
              {servedItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2 py-1.5">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORS.primaryGreen }}
                  />
                  <span className="flex-1 text-xs" style={{ color: COLORS.grayText }}>
                    {item.name} ({item.qty})
                  </span>
                  <span className="text-[10px] flex-shrink-0" style={{ color: COLORS.grayText }}>
                    Served
                  </span>
                  {/* Served checkmark (no action) */}
                  <div className="min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2">
                    <Check className="w-5 h-5" style={{ color: COLORS.grayText }} strokeWidth={2.5} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── RIDER SECTION (Delivery + Aggregator only) ── */}
      {isDelivery && !isOwn && (
        <div
          className="px-3 py-2 border-b flex items-center gap-2"
          style={{ borderColor: COLORS.borderGray, backgroundColor: COLORS.sectionBg }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: COLORS.borderGray }}
          >
            <User className="w-3 h-3" style={{ color: COLORS.grayText }} />
          </div>
          <div className="flex-1 min-w-0">
            {order.rider ? (
              <>
                <div className="text-xs font-medium truncate" style={{ color: COLORS.darkText }}>{order.rider}</div>
                <div className="text-[10px]" style={{ color: COLORS.grayText }}>{order.riderPhone}</div>
              </>
            ) : (
              <div className="text-xs" style={{ color: COLORS.grayText }}>Awaiting Runner</div>
            )}
          </div>
        </div>
      )}

      {/* ── FOOTER ACTIONS — Dynamic based on fOrderStatus, 44px touch targets ── */}
      <div 
        className="px-3 py-2 flex items-center justify-between gap-2" 
        style={{ backgroundColor: COLORS.sectionBg }}
        onClick={(e) => e.stopPropagation()}
      >
        {isYetToConfirm ? (
          /* Yet to confirm — [X Reject] + [Accept] */
          <>
            <button
              data-testid={`reject-btn-${orderId}`}
              className="min-h-[44px] min-w-[44px] px-3 rounded-lg border flex items-center justify-center gap-1 text-xs font-semibold"
              style={{ borderColor: COLORS.errorText, color: COLORS.errorText }}
              onClick={() => onReject?.(order)}
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Reject</span>
            </button>
            <button
              data-testid={`accept-btn-${orderId}`}
              className="min-h-[44px] flex-1 px-4 text-sm font-bold rounded-lg"
              style={{ backgroundColor: COLORS.primaryGreen, color: "white" }}
              onClick={() => onAccept?.(order)}
            >
              Accept
            </button>
          </>
        ) : (
          /* Normal flow: [KOT] + [Ready/Serve/Bill] (order-level buttons only for Dine-In) */
          <>
            {/* KOT button - always visible */}
            <button
              data-testid={`kot-btn-${orderId}`}
              className="min-h-[44px] min-w-[44px] rounded-lg border flex items-center justify-center"
              style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
              title="Print KOT"
            >
              <Printer className="w-5 h-5" />
            </button>

            {/* Order-level action buttons - ONLY for Dine-In (not TakeAway/Delivery) */}
            {isDineIn && (
              <>
                {fOrderStatus === 1 && (
                  /* Preparing → Ready button (orange) */
                  <button
                    data-testid={`ready-btn-${orderId}`}
                    className="min-h-[44px] flex-1 px-4 text-sm font-bold rounded-lg"
                    style={{ backgroundColor: COLORS.primaryOrange, color: "white" }}
                    onClick={() => onMarkReady?.(order)}
                  >
                    Ready
                  </button>
                )}
                {fOrderStatus === 2 && (
                  /* Ready → Serve button (green) */
                  <button
                    data-testid={`serve-btn-${orderId}`}
                    className="min-h-[44px] flex-1 px-4 text-sm font-bold rounded-lg"
                    style={{ backgroundColor: COLORS.primaryGreen, color: "white" }}
                    onClick={() => onMarkServed?.(order)}
                  >
                    Serve
                  </button>
                )}
                {fOrderStatus === 5 && (
                  /* Served → Bill button (green) */
                  <button
                    data-testid={`bill-btn-${orderId}`}
                    className="min-h-[44px] flex-1 px-4 text-sm font-bold rounded-lg"
                    style={{ backgroundColor: COLORS.primaryGreen, color: "white" }}
                    onClick={() => onBillClick?.(order)}
                  >
                    Bill
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default OrderCard;
