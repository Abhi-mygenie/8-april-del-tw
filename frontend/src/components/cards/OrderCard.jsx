import { useState } from "react";
import { User, X, ChevronDown, ChevronUp, MapPin, Clock, Printer } from "lucide-react";
import { COLORS, SOURCE_COLORS } from "../../constants";

/**
 * Unified Order Card - Handles Dine-In, TakeAway, and Delivery
 * Compact design for Order View (4 cards per row)
 * 
 * @param {object}  order      - Full canonical order object from OrderContext
 * @param {string}  orderType  - 'dineIn' | 'takeAway' | 'delivery'
 * @param {string}  tableLabel - Dine-in only: table label ("T1", "WC")
 * @param {boolean} isSnoozed
 * @param {func}    onToggleSnooze
 * @param {func}    onEdit     - Opens OrderEntry for this order
 * @param {func}    onMarkReady - Handler for Ready button
 * @param {func}    onMarkServed - Handler for Serve button
 * @param {func}    onBillClick - Handler for Bill button
 * @param {func}    onCancelItem - Handler for item-level cancel
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
  onCancelItem,
}) => {
  const [showServed, setShowServed] = useState(false);
  const [showAddress, setShowAddress] = useState(false);

  if (!order) return null;

  const source = order.source || "own";
  const isOwn = source === "own";
  const isDineIn = orderType === "dineIn";
  const isDelivery = orderType === "delivery";
  const orderId = order.orderId || order.id;
  const fOrderStatus = order.fOrderStatus || 1;

  // Items grouped by status
  const items = order.items || [];
  const activeItems = items.filter(i => i.status !== "served");
  const servedItems = items.filter(i => i.status === "served");

  // Source logo
  const renderLogo = () => {
    if (isOwn) {
      return (
        <img
          src="/mygenie-logo.png"
          alt="MG"
          className="w-6 h-6 rounded flex-shrink-0 object-cover"
        />
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

  // Primary ID: table label for dine-in, order # for others
  const primaryId = isDineIn ? (tableLabel || "T?") : `#${order.orderNumber || orderId}`;

  // Handle item action (Ready/Serve) — item level
  const handleItemAction = (item, action) => {
    console.log(`[OrderCard] ${action} item ${item.id} on order ${orderId}`);
    // Item-level status update would go here
  };

  // Handle item cancel
  const handleItemCancel = (item) => {
    console.log(`[OrderCard] Cancel item ${item.id} on order ${orderId}`);
    if (onCancelItem) onCancelItem(order, item);
  };

  const isYetToConfirm = order.status === "yetToConfirm" || order.status === "pending";

  // Get action button config based on item status
  const getItemActionConfig = (item) => {
    if (item.status === 'preparing') return { label: 'Ready', color: COLORS.primaryOrange };
    if (item.status === 'ready') return { label: 'Serve', color: COLORS.primaryGreen };
    return null;
  };

  return (
    <div
      data-testid={`order-card-${orderId}`}
      className={`rounded-lg shadow-sm overflow-hidden ${isSnoozed ? "opacity-60" : ""}`}
      style={{ backgroundColor: COLORS.lightBg, border: `1px solid ${COLORS.borderGray}` }}
    >
      {/* ── HEADER — Compact 3-zone layout ── */}
      <div
        className="px-3 py-2 flex items-center border-b"
        style={{ borderColor: COLORS.borderGray }}
      >
        {/* LEFT: Logo + ID + Customer */}
        <div className="flex items-center gap-1.5 min-w-0 flex-shrink-0">
          {renderLogo()}
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] font-bold" style={{ color: COLORS.darkText }}>
              {primaryId}
            </span>
            <span className="text-xs font-medium truncate max-w-[60px]" style={{ color: COLORS.darkText }}>
              {order.customer || "WC"}
            </span>
          </div>
          {isDelivery && isOwn && (
            <button
              data-testid={`address-btn-${orderId}`}
              className="p-1.5 hover:bg-gray-100 rounded flex-shrink-0"
              onClick={() => setShowAddress(!showAddress)}
              title="View address"
            >
              <MapPin className="w-3 h-3" style={{ color: COLORS.grayText }} />
            </button>
          )}
        </div>

        {/* CENTER: Waiter + Time */}
        <div className="flex-1 flex items-center justify-center gap-1 px-1">
          {isOwn && order.waiter && (
            <span className="text-[10px] truncate" style={{ color: COLORS.grayText }}>
              {order.waiter}
            </span>
          )}
          <span className="text-[10px]" style={{ color: COLORS.grayText }}>
            · {order.time}
          </span>
        </div>

        {/* RIGHT: Amount + Snooze */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="font-bold text-sm" style={{ color: COLORS.primaryOrange }}>
            ₹{(order.amount || 0).toLocaleString()}
          </span>
          {onToggleSnooze && (
            <button
              data-testid={`snooze-btn-${orderId}`}
              onClick={(e) => { e.stopPropagation(); onToggleSnooze(String(orderId)); }}
              className={`p-1.5 rounded flex-shrink-0 transition-colors ${isSnoozed ? "bg-orange-100" : "hover:bg-gray-100"}`}
              title={isSnoozed ? "Unsnooze" : "Snooze"}
            >
              <Clock className="w-3.5 h-3.5" style={{ color: isSnoozed ? COLORS.primaryOrange : COLORS.grayText }} />
            </button>
          )}
        </div>
      </div>

      {/* ── ADDRESS POPUP (own delivery) ── */}
      {showAddress && isDelivery && isOwn && (
        <div className="px-3 py-1.5 border-b text-[10px]" style={{ borderColor: COLORS.borderGray, backgroundColor: COLORS.sectionBg }}>
          <div className="flex items-start gap-1.5">
            <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: COLORS.primaryOrange }} />
            <span style={{ color: COLORS.darkText }}>
              {order.deliveryAddress?.formatted || order.deliveryAddress?.address || "No address"}
            </span>
          </div>
        </div>
      )}

      {/* ── ITEMS SECTION — Compact, no status text ── */}
      <div className="px-3 py-1.5 border-b" style={{ borderColor: COLORS.borderGray }}>
        {activeItems.length > 0 ? (
          activeItems.map((item) => {
            const actionCfg = getItemActionConfig(item);
            return (
              <div key={item.id} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: actionCfg?.color || COLORS.primaryGreen }}
                  />
                  <span className="text-xs truncate" style={{ color: COLORS.darkText }}>
                    {item.name} ({item.qty})
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Item-level cancel */}
                  <button
                    data-testid={`cancel-item-${item.id}`}
                    className="p-1 rounded hover:bg-red-50"
                    onClick={() => handleItemCancel(item)}
                    title="Cancel item"
                  >
                    <X className="w-3.5 h-3.5" style={{ color: COLORS.errorText }} />
                  </button>
                  {/* Item-level action */}
                  {actionCfg && item.status !== "served" && (
                    <button
                      data-testid={`item-action-${item.id}`}
                      className="px-2 py-1 text-[10px] font-bold rounded"
                      style={{
                        backgroundColor: actionCfg.color,
                        color: "white",
                      }}
                      onClick={() => handleItemAction(item, actionCfg.label)}
                    >
                      {actionCfg.label}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-1 text-[10px]" style={{ color: COLORS.grayText }}>
            No active items
          </div>
        )}
      </div>

      {/* ── SERVED ITEMS COLLAPSED ── */}
      {servedItems.length > 0 && (
        <div className="border-b" style={{ borderColor: COLORS.borderGray }}>
          <button
            data-testid={`served-toggle-${orderId}`}
            className="w-full px-3 py-1.5 flex items-center justify-between text-[10px] hover:bg-gray-50"
            style={{ color: COLORS.grayText }}
            onClick={() => setShowServed(!showServed)}
          >
            <span>Served ({servedItems.length})</span>
            {showServed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {showServed && (
            <div className="px-3 pb-1.5">
              {servedItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS.primaryGreen }}
                    />
                    <span className="text-[10px]" style={{ color: COLORS.grayText }}>
                      {item.name} ({item.qty})
                    </span>
                  </div>
                  <button
                    data-testid={`cancel-served-${item.id}`}
                    className="p-1 rounded hover:bg-red-50"
                    onClick={() => handleItemCancel(item)}
                    title="Cancel item"
                  >
                    <X className="w-3 h-3" style={{ color: COLORS.errorText }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── RIDER SECTION (Delivery + Aggregator only) ── */}
      {isDelivery && !isOwn && (
        <div
          className="px-3 py-1.5 border-b flex items-center gap-1.5"
          style={{ borderColor: COLORS.borderGray, backgroundColor: COLORS.sectionBg }}
        >
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: COLORS.borderGray }}
          >
            <User className="w-2.5 h-2.5" style={{ color: COLORS.grayText }} />
          </div>
          <div className="flex-1 min-w-0">
            {order.rider ? (
              <>
                <div className="text-[10px] font-medium truncate" style={{ color: COLORS.darkText }}>{order.rider}</div>
                <div className="text-[9px]" style={{ color: COLORS.grayText }}>{order.riderPhone}</div>
              </>
            ) : (
              <div className="text-[10px]" style={{ color: COLORS.grayText }}>Awaiting Runner</div>
            )}
          </div>
        </div>
      )}

      {/* ── FOOTER ACTIONS — Dynamic based on fOrderStatus ── */}
      <div className="px-3 py-2 flex items-center justify-between" style={{ backgroundColor: COLORS.sectionBg }}>
        {/* Left: KOT button (always visible) */}
        <button
          data-testid={`kot-btn-${orderId}`}
          className="p-2 rounded border flex items-center justify-center"
          style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
          title="Print KOT"
        >
          <Printer className="w-4 h-4" />
        </button>

        {/* Right: Dynamic action based on order status */}
        <div className="flex items-center gap-2">
          {isYetToConfirm ? (
            /* Yet to confirm — Reject + Accept */
            <>
              <button
                data-testid={`reject-btn-${orderId}`}
                className="p-2 rounded border flex items-center justify-center"
                style={{ borderColor: COLORS.errorText, color: COLORS.errorText }}
              >
                <X className="w-4 h-4" />
              </button>
              <button
                data-testid={`accept-btn-${orderId}`}
                className="px-4 py-2 text-xs font-bold rounded"
                style={{ backgroundColor: COLORS.primaryGreen, color: "white" }}
              >
                Accept
              </button>
            </>
          ) : fOrderStatus === 1 ? (
            /* Preparing — Ready button */
            <button
              data-testid={`ready-btn-${orderId}`}
              className="px-4 py-2 text-xs font-bold rounded"
              style={{ backgroundColor: COLORS.primaryOrange, color: "white" }}
              onClick={() => onMarkReady?.(order)}
            >
              Ready
            </button>
          ) : fOrderStatus === 2 ? (
            /* Ready — Serve button */
            <button
              data-testid={`serve-btn-${orderId}`}
              className="px-4 py-2 text-xs font-bold rounded"
              style={{ backgroundColor: COLORS.primaryGreen, color: "white" }}
              onClick={() => onMarkServed?.(order)}
            >
              Serve
            </button>
          ) : fOrderStatus === 5 ? (
            /* Served — Bill button */
            <button
              data-testid={`bill-btn-${orderId}`}
              className="px-4 py-2 text-xs font-bold rounded"
              style={{ backgroundColor: COLORS.primaryGreen, color: "white" }}
              onClick={() => onBillClick?.(order)}
            >
              Bill
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default OrderCard;
