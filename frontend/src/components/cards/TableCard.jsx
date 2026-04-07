import React, { useMemo } from "react";
import { Printer, Clock, X, Check, PlusSquare, ShoppingBag, Bike, Loader2 } from "lucide-react";
import PropTypes from 'prop-types';
import { COLORS, CONFIG } from "../../constants";
import { mockOrderItems } from "../../data";
import { getTableStatusConfig, isTableActive } from "../../utils";
import { IconButton, TextButton } from "./buttons";
import { CARD_BASE_STYLE } from "./TableCard.styles";

// Table Card Component - Simplified (no expansion, uses modal)
const TableCard = ({ table, onClick, onOpenModal, onUpdateStatus, onBillClick, onConfirmOrder, onCancelOrder, onMarkReady, onMarkServed, isSnoozed, onToggleSnooze, currencySymbol = '₹', isEngaged = false }) => {
  const statusConfig = getTableStatusConfig(table.status);
  const isActive = isTableActive(table.status);
  const hasOrders = ["occupied", "billReady"].includes(table.status);
  const isYetToConfirm = table.status === "yetToConfirm";
  
  const orderData = mockOrderItems[table.id] || { waiter: "", items: [] };

  // Memoize dynamic styles to prevent unnecessary re-renders
  // Border color is neutral gray for all cards (status shown via labels/buttons)
  const cardStyle = useMemo(() => ({
    ...CARD_BASE_STYLE,
    border: `3px solid #E5E5E5`,
    minHeight: CONFIG.CARD_MIN_HEIGHT,
  }), []);

  const headerPillStyle = useMemo(() => {
    // Different background colors by order type
    let bg = '#FFF9E6'; // Default yellow for Dine-In
    if (table.orderType === 'takeAway') bg = '#C8E6C9';      // Green
    else if (table.orderType === 'delivery') bg = '#FFEBEE'; // Pink
    else if (table.orderType === 'walkIn') bg = '#FFF9E6';   // Yellow (same as Dine-In)
    else if (table.isRoom) bg = '#E3F2FD';                   // Blue for Room
    return {
      backgroundColor: bg,
      color: COLORS.darkText,
    };
  }, [table.orderType, table.isRoom]);

  const handleCardClick = () => {
    if (hasOrders || isYetToConfirm) {
      onOpenModal(table);
    } else {
      onClick(table);
    }
  };

  return (
    <div
      data-testid={`table-card-${table.id}`}
      onClick={isEngaged ? undefined : handleCardClick}
      className={`relative rounded-2xl transition-all duration-200 ${isEngaged ? 'pointer-events-none' : 'cursor-pointer hover:shadow-md'} ${isSnoozed ? 'opacity-60' : ''}`}
      style={cardStyle}
    >
      {/* Engaged spinner overlay */}
      {isEngaged && (
        <div className="absolute inset-0 z-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}>
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: COLORS.primaryOrange }} />
        </div>
      )}
      {/* Card Content */}
      <div className="p-2.5 h-full flex flex-col">
        {/* Header Pill */}
        <div
          className="w-full px-4 py-1.5 rounded-xl flex items-center justify-between font-bold overflow-hidden"
          style={headerPillStyle}
        >
          <div className="flex items-center gap-2 min-w-0">
            {table.orderType === 'takeAway' && <ShoppingBag className="w-3.5 h-3.5 flex-shrink-0" style={{ color: COLORS.primaryOrange }} />}
            {table.orderType === 'delivery' && <Bike className="w-3.5 h-3.5 flex-shrink-0" style={{ color: COLORS.primaryOrange }} />}
            <span className="text-sm font-bold truncate" title={table.label || table.id}>{table.label || table.id}</span>
          </div>
          {table.status === "reserved" ? (
            <span className="text-xs font-semibold flex-shrink-0" style={{ color: COLORS.primaryOrange }}>Reserved</span>
          ) : table.amount ? (
            <span className="text-xs font-semibold flex-shrink-0">{currencySymbol}{table.amount.toLocaleString()}</span>
          ) : null}
          
          {/* Snooze Button - Only for yetToConfirm orders */}
          {isYetToConfirm && onToggleSnooze && (
            <button
              data-testid={`snooze-btn-${table.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleSnooze(table.id);
              }}
              className={`p-1 rounded transition-colors ${isSnoozed ? 'bg-white/30' : 'hover:bg-white/20'}`}
              title={isSnoozed ? "Unsnooze" : "Snooze"}
              aria-label={isSnoozed ? `Unsnooze order for table ${table.id}` : `Snooze order for table ${table.id}`}
            >
              <Clock className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Available - Add order icon centered + Available label at bottom */}
        {!isActive && (
          <>
            <div className="flex-1 flex items-center justify-center">
              <PlusSquare className="w-6 h-6" style={{ color: COLORS.primaryOrange }} />
            </div>
            <div
              className="flex items-center justify-center rounded-lg text-xs font-semibold py-3"
              style={{ backgroundColor: COLORS.sectionBg, color: COLORS.grayText }}
              data-testid={`available-label-${table.id}`}
            >
              Available
            </div>
          </>
        )}

        {/* Active content */}
        {isActive && (
          <div className="mt-2.5 flex-1 flex flex-col">
            {/* Primary name + Status — Rooms: customer, Tables: waiter */}
            <div className="text-sm leading-tight whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: COLORS.darkText }}>
              {table.status === "reserved" 
                ? <span className="font-semibold">{table.reservedFor}</span>
                : (
                  <>
                    <span className="font-semibold">
                      {table.isRoom
                        ? (table.customer || 'NA')
                        : (table.waiter || 'NA')}
                    </span>
                    {/* Add status label inline - normal weight to match bottom style */}
                    {table.fOrderStatus === 1 && <span style={{ color: COLORS.primaryOrange }}> • Preparing</span>}
                    {table.fOrderStatus === 2 && <span style={{ color: COLORS.primaryGreen }}> • Ready</span>}
                    {table.fOrderStatus === 5 && <span style={{ color: COLORS.primaryGreen }}> • Served</span>}
                    {table.fOrderStatus === 7 && <span style={{ color: COLORS.amber }}> • Confirming</span>}
                  </>
                )}
            </div>
            
            {/* Time */}
            <div className="text-xs mt-1 mb-2 whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: COLORS.grayText }}>
              <span>{table.status === "reserved" ? table.reservedTime : table.time}</span>
            </div>

            {/* Action Buttons */}
            {isYetToConfirm ? (
              /* Yet to Confirm: Cancel (red X) left + Confirm (green tick) right */
              <div className="flex justify-between">
                <IconButton
                  icon={X}
                  onClick={() => onCancelOrder?.(table)}
                  backgroundColor={COLORS.errorBg}
                  iconColor={COLORS.errorText}
                  testId={`cancel-btn-${table.id}`}
                  title="Cancel Order"
                  ariaLabel={`Cancel order for table ${table.id}`}
                />
                <IconButton
                  icon={Check}
                  onClick={() => onConfirmOrder?.(table)}
                  backgroundColor={COLORS.primaryGreen}
                  iconColor="white"
                  testId={`confirm-btn-${table.id}`}
                  title="Confirm Order"
                  ariaLabel={`Confirm order for table ${table.id}`}
                />
              </div>
            ) : hasOrders ? (
              /* Button rules:
                 fOrderStatus 1 (preparing) → KOT button + Ready button
                 fOrderStatus 2 (ready)     → KOT button + Serve button
                 fOrderStatus 5 (served)    → KOT button + Bill button */
              <div className="flex gap-2">
                {table.fOrderStatus === 1 && (
                  <>
                    <IconButton
                      icon={Printer}
                      onClick={() => {/* Print KOT - integrate with printer service */}}
                      backgroundColor={COLORS.borderGray}
                      testId={`print-btn-${table.id}`}
                      title="Print KOT"
                      ariaLabel={`Print KOT for table ${table.id}`}
                    />
                    <TextButton
                      onClick={() => onMarkReady?.(table)}
                      testId={`ready-btn-${table.id}`}
                      ariaLabel={`Mark order ready for table ${table.id}`}
                      fullWidth={false}
                      className="flex-1 text-xs py-2"
                    >
                      Ready
                    </TextButton>
                  </>
                )}
                {table.fOrderStatus === 2 && (
                  <>
                    <IconButton
                      icon={Printer}
                      onClick={() => {/* Print KOT - integrate with printer service */}}
                      backgroundColor={COLORS.borderGray}
                      testId={`print-btn-${table.id}`}
                      title="Print KOT"
                      ariaLabel={`Print KOT for table ${table.id}`}
                    />
                    <TextButton
                      onClick={() => onMarkServed?.(table)}
                      testId={`serve-btn-${table.id}`}
                      ariaLabel={`Mark order served for table ${table.id}`}
                      fullWidth={false}
                      className="flex-1 text-xs py-2"
                    >
                      Serve
                    </TextButton>
                  </>
                )}
                {table.fOrderStatus === 5 && (
                  <>
                    <IconButton
                      icon={Printer}
                      onClick={() => {/* Print KOT - integrate with printer service */}}
                      backgroundColor={COLORS.borderGray}
                      testId={`print-btn-${table.id}`}
                      title="Print KOT"
                      ariaLabel={`Print KOT for table ${table.id}`}
                    />
                    <TextButton
                      onClick={() => onBillClick?.(table)}
                      testId={`collect-btn-${table.id}`}
                      ariaLabel={`Collect payment for table ${table.id}`}
                      fullWidth={false}
                      className="flex-1 text-xs py-2"
                    >
                      {table.isRoom ? 'C/Out' : 'Bill'}
                    </TextButton>
                  </>
                )}
              </div>
            ) : table.status === "reserved" ? (
              /* Reserved: Cancel (red X) left + Seat button right */
              <div className="flex gap-2">
                <IconButton
                  icon={X}
                  onClick={() => onUpdateStatus?.(table.id, "available")}
                  backgroundColor={COLORS.errorBg}
                  iconColor={COLORS.errorText}
                  testId={`cancel-reservation-btn-${table.id}`}
                  title="Cancel Reservation"
                  ariaLabel={`Cancel reservation for table ${table.id}`}
                />
                <TextButton
                  onClick={() => onClick(table)}
                  backgroundColor={COLORS.primaryOrange}
                  testId={`seat-btn-${table.id}`}
                  ariaLabel={`Seat customer at table ${table.id}`}
                >
                  Seat
                </TextButton>
              </div>
            ) : statusConfig.buttonText && (
              /* Paid: Clear button - directly sets table to available */
              <TextButton
                onClick={() => onUpdateStatus?.(table.id, "available")}
                testId={`action-btn-${table.id}`}
                ariaLabel={`${statusConfig.buttonText} for table ${table.id}`}
                fullWidth={true}
              >
                {statusConfig.buttonText}
              </TextButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

TableCard.propTypes = {
  table: PropTypes.shape({
    id: PropTypes.string.isRequired,
    status: PropTypes.oneOf([
      'available', 
      'occupied', 
      'reserved', 
      'paid', 
      'yetToConfirm', 
      'billReady'
    ]).isRequired,
    amount: PropTypes.number,
    reservedFor: PropTypes.string,
    reservedTime: PropTypes.string,
    time: PropTypes.string,
  }).isRequired,
  onClick: PropTypes.func.isRequired,
  onOpenModal: PropTypes.func,
  onUpdateStatus: PropTypes.func,
  onBillClick: PropTypes.func,
  onConfirmOrder: PropTypes.func,
  onCancelOrder: PropTypes.func,
  onMarkReady: PropTypes.func,
  onMarkServed: PropTypes.func,
  isSnoozed: PropTypes.bool,
  onToggleSnooze: PropTypes.func,
  isEngaged: PropTypes.bool,
};

TableCard.defaultProps = {
  onOpenModal: null,
  onUpdateStatus: null,
  onBillClick: null,
  onConfirmOrder: null,
  onCancelOrder: null,
  onMarkReady: null,
  onMarkServed: null,
  isSnoozed: false,
  onToggleSnooze: null,
  isEngaged: false,
};

export default TableCard;
