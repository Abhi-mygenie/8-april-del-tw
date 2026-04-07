import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { COLORS } from '../../constants';
import { sortByActiveFirst, TABLE_STATUS_PRIORITY } from '../../utils';
import TableCard from '../cards/TableCard';
import OrderCard from '../cards/OrderCard';

/**
 * ChannelColumn - Single column for a channel (Dine-In, TakeAway, Delivery, Room)
 * 
 * Features:
 * - Collapsible with header always visible
 * - Scrollable content area
 * - Renders TableCard or OrderCard based on viewType
 * - Shows "No orders" when empty
 * - Sorts by active first when enabled
 */
const ChannelColumn = ({
  channel,           // { id, name, items, enabled }
  width,             // Percentage width
  minWidth = 150,    // Minimum pixel width
  isCollapsed,
  activeFirst,
  viewType,          // 'table' | 'order'
  onCollapse,
  onItemClick,
  // Card handlers
  onMarkReady,
  onMarkServed,
  onBillClick,
  onCancelOrder,
  onItemStatusChange,
  onToggleSnooze,
  onConfirmOrder,
  onUpdateStatus,
  // Permissions
  canCancelOrder,
  canPrintBill,
  canBill,
  canMergeOrder,
  canShiftTable,
  canFoodTransfer,
  hasPermission,
  // Other
  snoozedOrders,
  currencySymbol,
  isTableEngaged,
  searchQuery,
  matchingIds,
}) => {
  // Filter by search if applicable
  const filteredItems = useMemo(() => {
    if (!channel.items) return [];
    if (matchingIds === null) return channel.items;
    return channel.items.filter(item => matchingIds.has(item.id || `${channel.id}-${item.orderId}`));
  }, [channel.items, matchingIds, channel.id]);

  // Sort items: active first if enabled
  const sortedItems = useMemo(() => {
    if (!activeFirst) return filteredItems;
    return sortByActiveFirst(filteredItems, TABLE_STATUS_PRIORITY, activeFirst);
  }, [filteredItems, activeFirst]);

  // Count active orders (non-available, non-reserved)
  const activeCount = useMemo(() => {
    return channel.items?.filter(item => 
      !['available', 'reserved', 'disabled'].includes(item.status)
    ).length || 0;
  }, [channel.items]);

  const totalCount = channel.items?.length || 0;

  // Collapsed view - just show header with expand button
  if (isCollapsed) {
    return (
      <div
        data-testid={`channel-column-${channel.id}-collapsed`}
        className="flex flex-col h-full bg-white rounded-lg shadow-sm"
        style={{ 
          width: '48px',
          minWidth: '48px',
          flexShrink: 0,
        }}
      >
        {/* Collapsed Header */}
        <div 
          className="flex flex-col items-center py-4 px-2 cursor-pointer hover:bg-gray-50"
          onClick={onCollapse}
          title={`Expand ${channel.name}`}
        >
          <ChevronRight className="w-5 h-5 mb-2" style={{ color: COLORS.grayText }} />
          <span 
            className="text-xs font-medium writing-mode-vertical"
            style={{ 
              color: COLORS.darkText,
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
            }}
          >
            {channel.name}
          </span>
          <span 
            className="text-xs mt-2 px-1.5 py-0.5 rounded-full"
            style={{ 
              backgroundColor: activeCount > 0 ? COLORS.primaryOrange : COLORS.borderGray,
              color: activeCount > 0 ? 'white' : COLORS.grayText,
            }}
          >
            {activeCount}
          </span>
        </div>
      </div>
    );
  }

  // Expanded view
  return (
    <div
      data-testid={`channel-column-${channel.id}`}
      className="flex flex-col h-full bg-white rounded-lg shadow-sm overflow-hidden"
      style={{ 
        width: `${width}%`,
        minWidth: `${minWidth}px`,
        flexShrink: 0,
      }}
    >
      {/* Column Header */}
      <div 
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: COLORS.borderGray }}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm" style={{ color: COLORS.darkText }}>
            {channel.name}
          </span>
          <span 
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ 
              backgroundColor: activeCount > 0 ? COLORS.primaryOrange : COLORS.borderGray,
              color: activeCount > 0 ? 'white' : COLORS.grayText,
            }}
          >
            {viewType === 'table' ? `${activeCount}/${totalCount}` : activeCount}
          </span>
        </div>
        
        {/* Collapse Button */}
        <button
          data-testid={`collapse-${channel.id}`}
          onClick={onCollapse}
          className="p-1 rounded hover:bg-gray-100 transition-colors"
          title={`Collapse ${channel.name}`}
        >
          <ChevronLeft className="w-4 h-4" style={{ color: COLORS.grayText }} />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {sortedItems.length === 0 ? (
          <div 
            className="flex items-center justify-center h-32 text-sm"
            style={{ color: COLORS.grayText }}
          >
            No orders
          </div>
        ) : (
          <div 
            className={viewType === 'table' ? 'grid gap-3' : 'flex flex-col gap-3'}
            style={viewType === 'table' ? { 
              gridTemplateColumns: 'repeat(auto-fill, 160px)',
              justifyContent: 'start',
            } : {}}
          >
            {sortedItems.map((item) => {
              const key = item.id || `${channel.id}-${item.orderId}`;
              
              // Table View - render TableCard
              if (viewType === 'table') {
                return (
                  <TableCard
                    key={key}
                    table={item}
                    onClick={onItemClick}
                    onOpenModal={onItemClick}
                    onUpdateStatus={onUpdateStatus}
                    onBillClick={onBillClick}
                    onConfirmOrder={onConfirmOrder}
                    onCancelOrder={onCancelOrder}
                    onMarkReady={onMarkReady}
                    onMarkServed={onMarkServed}
                    isSnoozed={snoozedOrders?.has(item.id)}
                    onToggleSnooze={onToggleSnooze}
                    currencySymbol={currencySymbol}
                    isEngaged={isTableEngaged?.(item.tableId)}
                  />
                );
              }
              
              // List View - render OrderCard
              // Need to get order data for the item
              const order = item.order || item;
              return (
                <OrderCard
                  key={key}
                  order={order}
                  orderType={channel.id}
                  tableLabel={item.label || item.tableNumber}
                  isSnoozed={snoozedOrders?.has(item.id)}
                  isEngaged={isTableEngaged?.(item.tableId)}
                  canCancelOrder={canCancelOrder ?? hasPermission?.('order_cancel')}
                  canMergeOrder={canMergeOrder ?? (channel.id === 'dineIn' && hasPermission?.('merge_table'))}
                  canShiftTable={canShiftTable ?? (channel.id === 'dineIn' && hasPermission?.('transfer_table'))}
                  canFoodTransfer={canFoodTransfer ?? (channel.id === 'dineIn' && hasPermission?.('food_transfer'))}
                  canPrintBill={canPrintBill ?? hasPermission?.('print_icon')}
                  canBill={canBill ?? hasPermission?.('bill')}
                  onToggleSnooze={onToggleSnooze}
                  onEdit={() => onItemClick?.(item)}
                  onMarkReady={() => onMarkReady?.(item)}
                  onMarkServed={() => onMarkServed?.(item)}
                  onBillClick={() => onBillClick?.(item)}
                  onCancelOrder={onCancelOrder}
                  onItemStatusChange={onItemStatusChange}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChannelColumn;
